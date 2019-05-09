# 智能合约的编译
node test/compile.js
- 产生一个compiled.json文件在contracts/build目录下

# 测试
ava -v test/*.test.js

# 登记: FileInfo合约
文件上传者在合约中记录上传文件的信息。

## API
- addFileInfo(bytes32 fileHash, string fInfo, string initComment)：新建或者更新发送者登记的文件信息
    - 参数fileHash: 文件标识
    - 参数fInfo: 文件信息
    - 参数initComment：评论
    - 例外：消息发送者必须支付一定的以太币，即msg.value > 0

- AddFileInfo事件：成功执行addFileInfo方法后触发该事件
  - 事件参数：address sender, bytes32 fileHash, string fInfo, string initComment, uint fee
    
- getFileInfo(bytes32 fileHash)：返回消息发送者登记的文件信息
    - 返回： string fInfo, string initComment, uint fee
    - 参数fileHash: 文件标识，32位byte数组

- getFileInfo(bytes32 fileHash， address sender)：返回指定发送者登记的文件信息
    - 返回： string fInfo, string initComment, uint fee
    - 参数fileHash: 文件标识
    
