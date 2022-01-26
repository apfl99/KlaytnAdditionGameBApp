const fs = require('fs') // 파일시스템 모듈
const AdditionGame = artifacts.require('./AdditionGame.sol')

module.exports = function (deployer) {
  deployer.deploy(AdditionGame)
  .then(()=> { //컨트랙 인스턴스를 위한 정보 파일에 저장
    if(AdditionGame._json) { // 성공적으로 json파일을 받았을 경우
        fs.writeFile('deployedABI',JSON.stringify(AdditionGame._json.abi), // 해당 파일에 ABI(블록체인과 컨트랙 상호작용) 정보 저장
            (err) => {
                if(err) throw err;
                console.log("파일에 ABI 입력 성공")
            }
        )
        fs.writeFile('deployedAddress',AdditionGame.address, // 해당 파일에 주소 저장
            (err) => {
                if(err) throw err;
                console.log("파일에 주소 입력 성공")
            }
        )

    }
  })
}
