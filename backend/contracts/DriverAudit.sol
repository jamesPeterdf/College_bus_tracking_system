// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DriverAudit
 * @dev Decentralized audit log for college bus driver remarks.
 */
contract DriverAudit {
    address public admin;

    struct Remark {
        string driverId;
        string content;
        uint256 timestamp;
        address author;
    }

    // Mapping from driverId to their list of remarks
    mapping(string => Remark[]) private driverRemarks;
    
    event RemarkAdded(string indexed driverId, string content, uint256 timestamp, address author);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can log remarks");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Logs a new remark for a driver on-chain.
     * @param _driverId The unique identifier of the driver.
     * @param _content The remark or report content.
     */
    function addRemark(string memory _driverId, string memory _content) public onlyAdmin {
        Remark memory newRemark = Remark({
            driverId: _driverId,
            content: _content,
            timestamp: block.timestamp,
            author: msg.sender
        });

        driverRemarks[_driverId].push(newRemark);
        emit RemarkAdded(_driverId, _content, block.timestamp, msg.sender);
    }

    /**
     * @dev Retrieves the total count of remarks for a driver.
     */
    function getRemarkCount(string memory _driverId) public view returns (uint256) {
        return driverRemarks[_driverId].length;
    }

    /**
     * @dev Retrieves a specific remark for a driver.
     */
    function getRemark(string memory _driverId, uint256 _index) public view returns (string memory, uint256, address) {
        Remark storage r = driverRemarks[_driverId][_index];
        return (r.content, r.timestamp, r.author);
    }

    /**
     * @dev Transfers administrative rights to a new address.
     */
    function transferAdmin(address _newAdmin) public onlyAdmin {
        require(_newAdmin != address(0), "Invalid address");
        admin = _newAdmin;
    }
}
