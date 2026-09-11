// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AuditLogger
 * @notice Immutable on-chain audit trail for TrustMesh.
 *
 * Records security-relevant actions performed by authorized
 * TrustMesh contracts such as:
 * - DIDRegistry
 * - PolicyEngine
 * - AssetNFT
 *
 * The contract is intentionally generic so it can be used
 * as an audit layer for different organizations and resources.
 */
contract AuditLogger {
    address public immutable admin;

    mapping(address => bool) public authorizedLogger;

    event LoggerAuthorized(
        address indexed logger,
        address indexed authorizedBy
    );

    event LoggerRevoked(
        address indexed logger,
        address indexed revokedBy
    );

    event AuditRecorded(
        address indexed actor,
        address indexed source,
        bytes32 indexed action,
        bytes32 resourceType,
        bytes32 resourceId,
        bool success,
        uint256 timestamp
    );

    error Unauthorized();
    error InvalidAddress();
    error EmptyAction();

    modifier onlyAdmin() {
        if (msg.sender != admin) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyAuthorizedLogger() {
        if (!authorizedLogger[msg.sender]) {
            revert Unauthorized();
        }
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Authorize a TrustMesh contract to write audit records.
     */
    function authorizeLogger(address logger) external onlyAdmin {
        if (logger == address(0)) {
            revert InvalidAddress();
        }

        authorizedLogger[logger] = true;

        emit LoggerAuthorized(
            logger,
            msg.sender
        );
    }

    /**
     * @notice Revoke a previously authorized audit writer.
     */
    function revokeLogger(address logger) external onlyAdmin {
        if (logger == address(0)) {
            revert InvalidAddress();
        }

        authorizedLogger[logger] = false;

        emit LoggerRevoked(
            logger,
            msg.sender
        );
    }

    /**
     * @notice Record a generic immutable audit event.
     *
     * @param actor The wallet/DID controller that performed the action.
     * @param action The action performed.
     * @param resourceType Generic resource category.
     * @param resourceId Identifier of the affected resource.
     * @param success Whether the operation succeeded.
     */
    function recordAudit(
        address actor,
        bytes32 action,
        bytes32 resourceType,
        bytes32 resourceId,
        bool success
    ) external onlyAuthorizedLogger {
        if (actor == address(0)) {
            revert InvalidAddress();
        }

        if (action == bytes32(0)) {
            revert EmptyAction();
        }

        emit AuditRecorded(
            actor,
            msg.sender,
            action,
            resourceType,
            resourceId,
            success,
            block.timestamp
        );
    }

    /**
     * @notice Check whether an address may write audit records.
     */
    function isAuthorizedLogger(
        address logger
    ) external view returns (bool) {
        return authorizedLogger[logger];
    }
}