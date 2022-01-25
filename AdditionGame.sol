pragma solidity ^0.4.24;

contract AdditionGame {
    address public owner;

    //생성자
    constructor() public {
        owner = msg.sender; // 컨트랙 배포자를 저장 및 기록
    }
    
    function getBalance() public view returns (uint) {
        return address(this).balance; // 해당 컨트랙의 Klaytn 잔액을 불러올 수 있음
    }

    function deposit() public payable {  
        require(msg.sender == owner); // 유효성 체크(컨트랙 배포자만 해당 컨트랙에 송금 가능)
    }   
  
    //정답시 사용자에게 송금
    function transfer(uint _value) public returns (bool) {
        require(getBalance() >= _value); //유효성 체크(잔액)
        msg.sender.transfer(_value); //송금
        return true;
    }
}

