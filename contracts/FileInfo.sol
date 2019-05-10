pragma solidity >=0.4.22 <0.7.0;

contract FileInfo {
    struct Info{
        string info;
        string initComment;
        uint fee;
    }

    address public creator;

    event AddFileInfo(address sender, bytes32 fileHash, string fInfo, string initComment, uint fee);

    mapping(bytes32 => mapping(address => Info)) private filesInfo;
    mapping(bytes32 => Info[]) private infoArray;

    constructor() public {
        creator = msg.sender;
    }

    function addFileInfo(bytes32 fileHash, string memory fInfo, string memory initComment) public payable
    {
        require(msg.value > 0, 'must pay additional fee in this transaction');
        // mapping(address => Info) storage infos = filesInfo[fileHash];
        Info storage info = filesInfo[fileHash][msg.sender];
        info.info = fInfo;
        info.initComment = initComment;
        info.fee += msg.value;
        Info[] storage infos = infoArray[fileHash];
        infos.push(info);
        emit AddFileInfo(msg.sender, fileHash, fInfo, initComment, info.fee);
    }

    function getFileInfo(bytes32 fileHash) public view returns (string memory fInfo, string memory initComment, uint fee)
    {
        Info storage info = filesInfo[fileHash][msg.sender];
        fInfo = info.info;
        initComment = info.initComment;
        fee = info.fee;
    }

    function getFileInfo(bytes32 fileHash, address sender) public view returns (string memory fInfo, string memory initComment, uint fee) {
        Info storage info = filesInfo[fileHash][sender];
        fInfo = info.info;
        initComment = info.initComment;
        fee = info.fee;
    }

    function getFileInfoSize(bytes32 fileHash) public view returns (uint size) {
        size = infoArray[fileHash].length;
    }
}