// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IPolicyAuditLogger {
    function recordAudit(
        address actor,
        bytes32 action,
        bytes32 resourceType,
        bytes32 resourceId,
        bool success
    ) external;
}

/// @title PolicyEngine
/// @notice Generic on-chain RBAC engine for TrustMesh.
/// @dev Organizations define their own roles, resources, actions and policies.
///      Roles such as Admin/Manager/User are NOT hard-coded.
contract PolicyEngine is Ownable {
    struct Role {
        bool exists;
        string name;
    }

    mapping(bytes32 => Role) private _roles;

    mapping(address => bytes32) private _userRoles;

    mapping(
        bytes32 =>
            mapping(
                bytes32 =>
                    mapping(bytes32 => bool)
            )
    ) private _permissions;

    IPolicyAuditLogger public immutable auditLogger;

    bytes32 public constant ROLE_RESOURCE =
        keccak256("ROLE");

    bytes32 public constant ROLE_CREATED =
        keccak256("ROLE_CREATED");

    bytes32 public constant ROLE_ASSIGNED =
        keccak256("ROLE_ASSIGNED");

    bytes32 public constant ROLE_REVOKED =
        keccak256("ROLE_REVOKED");

    bytes32 public constant ACCESS_GRANTED =
        keccak256("ACCESS_GRANTED");

    bytes32 public constant ACCESS_DENIED =
        keccak256("ACCESS_DENIED");

    event RoleCreated(
        bytes32 indexed roleId,
        string name
    );

    event RoleAssigned(
        address indexed subject,
        bytes32 indexed roleId
    );

    event RoleRevoked(
        address indexed subject,
        bytes32 indexed roleId
    );

    event PermissionConfigured(
        bytes32 indexed roleId,
        bytes32 indexed resourceId,
        bytes32 indexed actionId,
        bool allowed
    );

    event AccessGranted(
        address indexed subject,
        bytes32 indexed roleId,
        bytes32 indexed resourceId,
        bytes32 actionId
    );

    event AccessDenied(
        address indexed subject,
        bytes32 indexed roleId,
        bytes32 indexed resourceId,
        bytes32 actionId
    );

    error EmptyRoleName();
    error InvalidRole();
    error RoleAlreadyExists();
    error InvalidSubject();
    error RoleNotAssigned();
    error InvalidAuditLogger();

    constructor(
        address auditLoggerAddress
    )
        Ownable(msg.sender)
    {
        if (auditLoggerAddress == address(0)) {
            revert InvalidAuditLogger();
        }

        auditLogger =
            IPolicyAuditLogger(
                auditLoggerAddress
            );
    }

    function createRole(
        bytes32 roleId,
        string calldata name
    )
        external
        onlyOwner
    {
        if (roleId == bytes32(0)) {
            revert InvalidRole();
        }

        if (bytes(name).length == 0) {
            revert EmptyRoleName();
        }

        if (_roles[roleId].exists) {
            revert RoleAlreadyExists();
        }

        _roles[roleId] = Role({
            exists: true,
            name: name
        });

        emit RoleCreated(
            roleId,
            name
        );

        auditLogger.recordAudit(
            msg.sender,
            ROLE_CREATED,
            ROLE_RESOURCE,
            roleId,
            true
        );
    }

    function assignRole(
        address subject,
        bytes32 roleId
    )
        external
        onlyOwner
    {
        if (subject == address(0)) {
            revert InvalidSubject();
        }

        if (!_roles[roleId].exists) {
            revert InvalidRole();
        }

        _userRoles[subject] = roleId;

        emit RoleAssigned(
            subject,
            roleId
        );

        auditLogger.recordAudit(
            subject,
            ROLE_ASSIGNED,
            ROLE_RESOURCE,
            roleId,
            true
        );
    }

    function revokeRole(
        address subject
    )
        external
        onlyOwner
    {
        if (subject == address(0)) {
            revert InvalidSubject();
        }

        bytes32 roleId =
            _userRoles[subject];

        if (roleId == bytes32(0)) {
            revert RoleNotAssigned();
        }

        delete _userRoles[subject];

        emit RoleRevoked(
            subject,
            roleId
        );

        auditLogger.recordAudit(
            subject,
            ROLE_REVOKED,
            ROLE_RESOURCE,
            roleId,
            true
        );
    }

    function setPermission(
        bytes32 roleId,
        bytes32 resourceId,
        bytes32 actionId,
        bool allowed
    )
        external
        onlyOwner
    {
        if (!_roles[roleId].exists) {
            revert InvalidRole();
        }

        if (
            resourceId == bytes32(0) ||
            actionId == bytes32(0)
        ) {
            revert InvalidRole();
        }

        _permissions[roleId][resourceId][actionId] =
            allowed;

        emit PermissionConfigured(
            roleId,
            resourceId,
            actionId,
            allowed
        );
    }

    function checkAccess(
        address subject,
        bytes32 resourceId,
        bytes32 actionId
    )
        external
        returns (bool allowed)
    {
        bytes32 roleId =
            _userRoles[subject];

        allowed =
            subject != address(0) &&
            roleId != bytes32(0) &&
            resourceId != bytes32(0) &&
            actionId != bytes32(0) &&
            _permissions[
                roleId
            ][
                resourceId
            ][
                actionId
            ];

        if (allowed) {
            emit AccessGranted(
                subject,
                roleId,
                resourceId,
                actionId
            );

            auditLogger.recordAudit(
                subject,
                ACCESS_GRANTED,
                resourceId,
                actionId,
                true
            );
        } else {
            emit AccessDenied(
                subject,
                roleId,
                resourceId,
                actionId
            );

            auditLogger.recordAudit(
                subject,
                ACCESS_DENIED,
                resourceId,
                actionId,
                false
            );
        }
    }

    function getUserRole(
        address subject
    )
        external
        view
        returns (bytes32)
    {
        return _userRoles[subject];
    }

    function getRole(
        bytes32 roleId
    )
        external
        view
        returns (
            bool exists,
            string memory name
        )
    {
        Role memory role =
            _roles[roleId];

        return (
            role.exists,
            role.name
        );
    }

    function hasPermission(
        address subject,
        bytes32 resourceId,
        bytes32 actionId
    )
        external
        view
        returns (bool)
    {
        bytes32 roleId =
            _userRoles[subject];

        return
            subject != address(0) &&
            roleId != bytes32(0) &&
            resourceId != bytes32(0) &&
            actionId != bytes32(0) &&
            _permissions[
                roleId
            ][
                resourceId
            ][
                actionId
            ];
    }
}