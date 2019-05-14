pragma solidity >=0.4.22 <0.7.0;

contract FileInfo {
    struct Info{
        string info;
        string initComment;
        uint fee;
        address sender;
    }

    address public creator;

    event AddFileInfo(address sender, bytes32 fileHash, string fInfo, string initComment, uint fee);

    mapping(bytes32 => mapping(address => Info)) private filesInfo;
    mapping(bytes32 => Info[]) private infoArray;
    mapping(bytes32 => mapping(address => uint)) private map2ArrayIndex;

    constructor() public {
        creator = msg.sender;
    }

    function addFileInfo(bytes32 fileHash, string memory fInfo, string memory initComment) public payable
    {
        require(msg.value > 0, 'must pay additional fee in this transaction');
        // mapping(address => Info) storage infos = filesInfo[fileHash];
        Info storage info = filesInfo[fileHash][msg.sender];
        uint originalFee = info.fee;
        info.info = fInfo;
        info.initComment = initComment;
        info.fee += msg.value;
        info.sender = msg.sender;
        Info[] storage infos = infoArray[fileHash];
        if (originalFee <= 0) {
            map2ArrayIndex[fileHash][msg.sender] = infos.length;
            infos.push(info);
        } else {
            uint index = map2ArrayIndex[fileHash][msg.sender];
            Info storage infoA = infos[index];
            infoA.info = fInfo;
            infoA.initComment = initComment;
            infoA.fee += msg.value;
            infoA.sender = msg.sender;
        }
        emit AddFileInfo(msg.sender, fileHash, fInfo, initComment, info.fee);
    }

    function getFileInfo(bytes32 fileHash) public view returns (string memory fInfo, string memory initComment, uint fee)
    {
        Info storage info = filesInfo[fileHash][msg.sender];
        (fInfo, initComment, fee) = (info.info, info.initComment, info.fee);
    }

    function getFileInfo(bytes32 fileHash, address sender) public view returns (string memory fInfo, string memory initComment, uint fee) {
        Info storage info = filesInfo[fileHash][sender];
        (fInfo, initComment, fee) = (info.info, info.initComment, info.fee);
    }

    function getFileInfoSize(bytes32 fileHash) public view returns (uint size) {
        size = infoArray[fileHash].length;
    }

    function getFileInfoByIndex(bytes32 fileHash, uint index) public view returns (string memory fInfo, string memory initComment, uint fee, address sender) {
        require(index >= 0 && index < infoArray[fileHash].length, 'invalid index: < 0  or > maxsize');
        Info[] storage arr = infoArray[fileHash];
        Info storage info = arr[index];
        (fInfo, initComment, fee, sender) = (info.info, info.initComment, info.fee, info.sender);
    }
}