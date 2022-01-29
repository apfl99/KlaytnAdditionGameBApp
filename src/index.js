import Caver from "caver-js";
import { isTxHash } from "caver-js/packages/caver-utils";
import { Spinner } from "spin.js";

// 클레이튼 노드 정의
const config = {
	rpcURL: 'https://api.baobab.klaytn.net:8651'
}
const cav = new Caver(config.rpcURL); //인스턴스화
const agContract = new cav.klay.Contract(DEPLOYED_ABI, DEPLOYED_ADDRESS); // 컨트랙 정보(deployedABI, deployedAddress)를 가져와서 인스턴스화

const App = {
  //인증 필드 정의
  auth: {
    accessType: '',
    keystore: '',
    password: ''
  },

  // 웹페이지 접속시 처음 실행되는 로직
  start: async function () {
    const walletFromSession = sessionStorage.getItem('walletInstance'); // 세션에 있는 wallet 계정 정보 import
    if (walletFromSession) { // 세션 값 확인
      try { // 유효
        cav.klay.accounts.wallet.add(JSON.parse(walletFromSession)); // 세션에 있는 정보로 caver wallet 추가
        this.changeUI(JSON.parse(walletFromSession)); // UI 최신화
      } catch(e) { 
        sessionStorage.removeItem('walletInstance');
      }
    }
  },

  handleImport: async function () {
    this.auth.accessType = 'keystore'; //keystore를 통한 로그인
    const fileReader = new FileReader();
    fileReader.readAsText(event.target.files[0]); // 선택한 파일 읽기
    fileReader.onload = (event) => {      
      try {     
        if (!this.checkValidKeystore(event.target.result)) { //keystore 파일 유효성 검사
          $('#message_pw').text('유효하지 않은 keystore 파일입니다.');
          return;
        }    
        this.auth.keystore = event.target.result; //auth.keystore 저장
        $('#message_pw').text('keystore 통과. 비밀번호를 입력하세요.');
        document.querySelector('#input-password').focus();
      } catch (event) { // 파일 읽기에서 error
        $('#message_pw').text('유효하지 않은 keystore 파일입니다.');
        return;
      }
    }   
  },

  handlePassword: async function () {
    this.auth.password = event.target.value; // auth.password 저장
  },

  handleLogin: async function () {
    if (this.auth.accessType === 'keystore') { //keystore 로그인 시
      try {
        // keystore와 password 정보를 가지고 privatekey 추출(복호화)
        const privateKey = cav.klay.accounts.decrypt(this.auth.keystore, this.auth.password).privateKey;
        this.integrateWallet(privateKey); // wallet 인스턴스 생성
      } catch (e) {      
        $('#message_pw').text('비밀번호가 일치하지 않습니다.');
      }
    }
    else {  // 비밀키 로그인 시
      try {
        const privateKey = this.auth.password; 
        this.integrateWallet(privateKey);
      } catch (e) {
        $('#message_pk').text('비밀키가 일치하지 않습니다.');
      }
    }
  },

  handleLogout: async function () {
    this.removeWallet(); //wallet 계정, 세션, auth 초기화
    location.reload(); //새로고침
  },

  generateNumbers: async function () {
    var num1 = Math.floor((Math.random() * 50 ) + 10);
    var num2 = Math.floor((Math.random() * 50 ) + 10);
    sessionStorage.setItem('result', num1+num2); //세션에 정답 저장

    $('#start').hide();
    $('#num1').text(num1);
    $('#num2').text(num2);
    $('#question').show();
    document.querySelector('#answer').focus();

    this.showTimer();
  },

  submitAnswer: async function () {
    const result = sessionStorage.getItem('result'); // 세션에서 정답을 가져옴
    var answer = $('#answer').val(); // 사용자 입력값 가져옴
    if (answer === result) { // 비교
      if(confirm("Good Job!! 0.1 KLAY 받기")) {
        if(await this.callContractBalance() >= 0.1) { //계정 잔액이 0.1보다 클때 
          this.receiveKlay(); // 전송
        }
        else {
          alert("죄송합니다. 컨트랙의 KLAY가 다 소모되었습니다.");
        }
      }
    } else {
      alert("땡!!!!!!!!");
    }
  },

  //컨트랙에 송금
  deposit: async function () {
    var spinner = this.showSpinner();
    const walletInstance = this.getWallet(); // 현재 로그인 정보(caver wallet)

    if (walletInstance) {
      // 로그인 계정 주소와 컨트랙 계정 주소 비교
      // 다를 경우 진행 불가
      if ((await this.callOwner()).toUpperCase() !== walletInstance.address.toUpperCase()) return;
      else {
        var amount = $('#amount').val(); // html 입력값 가져옴
        if (amount) {
          agContract.methods.deposit().send({ // klay 전송(호출 주소, 가스 비용, 전송 금액)
            from: walletInstance.address,
            gas: '250000',
            value: cav.utils.toPeb(amount, "KLAY")
          })
          .once('transactionHash', (txHash) => { // 트랜잭션 해쉬 확인
            console.log(`txHash: ${txHash}`)
          })
          .once('receipt',(receipt) => { // 영수증 확인 후 전송 완결.
            console.log(`(#${receipt.blocknumber})`, receipt);
            spinner.stop();
            alert(amount + "KLAY를 컨트랙에 송금했습니다.");
            location.reload();
          })
          .once('error', (error) => {
            alert(error.message);
          });
        }
        return; // amount가 없을 경우
      } 
    }
  },

  callOwner: async function () {
    return await agContract.methods.owner().call(); // 배포된 컨트랙의 owner 반환(비동기)
  },

  callContractBalance: async function () {
    return await agContract.methods.getBalance().call(); //getBalance를 통해 컨트랙 잔액 반환
  },

  getWallet: function () {
    if (cav.klay.accounts.wallet.length) { // 로그인 계정이 있다면
      return cav.klay.accounts.wallet[0]; // 로그인 계정 반환
    }
  },

  checkValidKeystore: function (keystore) {
    const parsedKeystore = JSON.parse(keystore); //keystore 파일 내용 분해 및 오브젝트로
    //keystore v4 형식
    const isValidKeystore = parsedKeystore.version &&
      parsedKeystore.id &&
      parsedKeystore.address &&
      parsedKeystore.keyring;  

    return isValidKeystore;
  },

  integrateWallet: function (privateKey) {
    const walletInstance = cav.klay.accounts.privateKeyToAccount(privateKey);
    cav.klay.accounts.wallet.add(walletInstance) // 생성한 인스턴스를 caver wallet에 추가
    sessionStorage.setItem('walletInstance', JSON.stringify(walletInstance)); // 세션 처리(로그인 유지)
    this.changeUI(walletInstance);  //로그인 시 UI 변경
  },

  // auth 전역변수 초기화
  reset: function () {
    this.auth = {
      keystore: '',
      password: ''
    };
  },

  //UI
  changeUI: async function (walletInstance) {
    $('#loginModal_keystore').modal('hide');
    $('#loginModal_privateKey').modal('hide');
    $('#login_keystore').hide();
    $('#login_privateKey').hide(); 
    $('#logout').show();
    $('#game').show();
    $('#address').append('<br>' + '<p>' + '내 계정 주소: ' + walletInstance.address + '</p>');     
    $('#contractBalance').append('<p>' + '이벤트 잔액: ' + cav.utils.fromPeb(await this.callContractBalance(), "KLAY") + 'KLAY' + '</p>');
    
    //컨트랙 송금 html 조건(owner와 로그인 계정 정보 확인)
    if ((await this.callOwner()).toUpperCase() === walletInstance.address.toUpperCase()) {
      $('#owner').show();
    }
  },

  removeWallet: function () {
    cav.klay.accounts.wallet.clear(); // wallet 계정 초기화
    sessionStorage.removeItem('walletInstance'); //세션 초기화
    this.reset(); //auth 전역변수 초기화
  },

  showTimer: function () {
    var seconds = 5;
    $('#timer').text(seconds);

    var interval = setInterval(() => {
      $('#timer').text(--seconds);
      if (seconds <= 0) {
        $('#timer').text('');
        $('#answer').val('');
        $('#question').hide();
        $('#start').show();
        clearInterval(interval);
      }
    },1000);
  },

  showSpinner: function () {
    var target = document.getElementById("spin");
    return new Spinner(opts).spin(target);
  },

  receiveKlay: function () {
    var spinner = this.showSpinner();
    const walletInstance = this.getWallet(); // 로그인 wallet 계정 가져옴

    if (!walletInstance) return;  // 없을 경우 리턴

    agContract.methods.transfer(cav.utils.toPeb("0.1", "KLAY")).send({ // 송금
      from: walletInstance.address,
      gas: '250000'
    }).then(function (receipt) { // 영수증 발행 및 전송 트랙잭션 완결
      if (receipt.status) {
        spinner.stop();  
        alert("0.1 KLAY가 " + walletInstance.address + " 계정으로 지급되었습니다.");      
        $('#transaction').html("");
        $('#transaction').append(`<p><a href='https://baobab.klaytnscope.com/tx/${receipt.transactionHash}' target='_blank'>클레이튼 Scope에서 트랜젝션 확인</a></p>`);
        return agContract.methods.getBalance().call()
          .then(function (balance) {
            $('#contractBalance').html("");
            $('#contractBalance').append('<p>' + '이벤트 잔액: ' + cav.utils.fromPeb(balance, "KLAY") + ' KLAY' + '</p>');           
        });        
      }
    });      
  }  
};

window.App = App;

window.addEventListener("load", function () { 
  App.start();
});

var opts = {
  lines: 10, // The number of lines to draw
  length: 30, // The length of each line
  width: 17, // The line thickness
  radius: 45, // The radius of the inner circle
  scale: 1, // Scales overall size of the spinner
  corners: 1, // Corner roundness (0..1)
  color: '#5bc0de', // CSS color or array of colors
  fadeColor: 'transparent', // CSS color or array of colors
  speed: 1, // Rounds per second
  rotate: 0, // The rotation offset
  animation: 'spinner-line-fade-quick', // The CSS animation name for the lines
  direction: 1, // 1: clockwise, -1: counterclockwise
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  className: 'spinner', // The CSS class to assign to the spinner
  top: '50%', // Top position relative to parent
  left: '50%', // Left position relative to parent
  shadow: '0 0 1px transparent', // Box-shadow for the lines
  position: 'absolute' // Element positioning
};