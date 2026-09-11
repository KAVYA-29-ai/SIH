// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDIDAuditLogger {
    function recordAudit(
        address actor,
        bytes32 action,
        bytes32 resourceType,
        bytes32 resourceId,
        bool success
    ) external;
}

/**
 * @title DIDRegistry
 * @notice Minimal on-chain registry for TrustMesh decentralized identities.
 *
 * Scope:
 * - DID creation
 * - DID resolution
 * - DID document reference
 * - Controller management
 * - Verification-key rotation
 * - Identity lifecycle (active / revoked)
 *
 * Audit:
 * - Security-relevant DID operations are recorded through AuditLogger.
 */
contract DIDRegistry {
    enum Status {
        None,
        Active,
        Revoked
    }

    struct DIDDocument {
        string documentReference;
        address controller;
        address verificationKey;
        uint256 createdAt;
        uint256 updatedAt;
        Status status;
    }

    mapping(bytes32 => DIDDocument) private _documents;

    IDIDAuditLogger public immutable auditLogger;

    bytes32 public constant IDENTITY_RESOURCE =
        keccak256("IDENTITY");

    bytes32 public constant DID_CREATED =
        keccak256("DID_CREATED");

    bytes32 public constant DID_DOCUMENT_UPDATED =
        keccak256("DID_DOCUMENT_UPDATED");

    bytes32 public constant CONTROLLER_UPDATED =
        keccak256("CONTROLLER_UPDATED");

    bytes32 public constant KEY_ROTATED =
        keccak256("KEY_ROTATED");

    bytes32 public constant DID_REVOKED =
        keccak256("DID_REVOKED");

    event DIDCreated(
        bytes32 indexed didHash,
        string did,
        address indexed controller,
        address verificationKey,
        string documentReference
    );

    event DIDDocumentUpdated(
        bytes32 indexed didHash,
        string documentReference
    );

    event ControllerUpdated(
        bytes32 indexed didHash,
        address indexed previousController,
        address indexed newController
    );

    event KeyRotated(
        bytes32 indexed didHash,
        address indexed previousKey,
        address indexed newKey
    );

    event DIDRevoked(
        bytes32 indexed didHash,
        address indexed controller
    );

    error DIDAlreadyExists();
    error DIDNotFound();
    error InvalidDID();
    error InvalidController();
    error InvalidVerificationKey();
    error InvalidDocumentReference();
    error NotController();
    error DIDNotActive();
    error SameKey();
    error SameController();
    error InvalidAuditLogger();

    modifier onlyExisting(bytes32 didHash) {
        if (_documents[didHash].status == Status.None) {
            revert DIDNotFound();
        }
        _;
    }

    modifier onlyActive(bytes32 didHash) {
        if (_documents[didHash].status != Status.Active) {
            revert DIDNotActive();
        }
        _;
    }

    modifier onlyController(bytes32 didHash) {
        if (_documents[didHash].controller != msg.sender) {
            revert NotController();
        }
        _;
    }

    constructor(address auditLoggerAddress) {
        if (auditLoggerAddress == address(0)) {
            revert InvalidAuditLogger();
        }

        auditLogger =
            IDIDAuditLogger(auditLoggerAddress);
    }

    function createDID(
        string calldata did,
        string calldata documentReference,
        address verificationKey
    ) external returns (bytes32 didHash) {
        if (bytes(did).length == 0) {
            revert InvalidDID();
        }

        if (bytes(documentReference).length == 0) {
            revert InvalidDocumentReference();
        }

        if (msg.sender == address(0)) {
            revert InvalidController();
        }

        if (verificationKey == address(0)) {
            revert InvalidVerificationKey();
        }

        didHash = keccak256(bytes(did));

        if (_documents[didHash].status != Status.None) {
            revert DIDAlreadyExists();
        }

        uint256 timestamp = block.timestamp;

        _documents[didHash] = DIDDocument({
            documentReference: documentReference,
            controller: msg.sender,
            verificationKey: verificationKey,
            createdAt: timestamp,
            updatedAt: timestamp,
            status: Status.Active
        });

        emit DIDCreated(
            didHash,
            did,
            msg.sender,
            verificationKey,
            documentReference
        );

        auditLogger.recordAudit(
            msg.sender,
            DID_CREATED,
            IDENTITY_RESOURCE,
            didHash,
            true
        );
    }

    function resolveDID(
        string calldata did
    )
        external
        view
        returns (DIDDocument memory)
    {
        bytes32 didHash = _hashDID(did);

        if (_documents[didHash].status == Status.None) {
            revert DIDNotFound();
        }

        return _documents[didHash];
    }

    function getDIDHash(
        string calldata did
    )
        external
        pure
        returns (bytes32)
    {
        return _hashDID(did);
    }

    function updateDocumentReference(
        string calldata did,
        string calldata newReference
    )
        external
        onlyExisting(_hashDID(did))
        onlyActive(_hashDID(did))
        onlyController(_hashDID(did))
    {
        if (bytes(newReference).length == 0) {
            revert InvalidDocumentReference();
        }

        bytes32 didHash = _hashDID(did);

        _documents[didHash].documentReference =
            newReference;

        _documents[didHash].updatedAt =
            block.timestamp;

        emit DIDDocumentUpdated(
            didHash,
            newReference
        );

        auditLogger.recordAudit(
            msg.sender,
            DID_DOCUMENT_UPDATED,
            IDENTITY_RESOURCE,
            didHash,
            true
        );
    }

    function rotateKey(
        string calldata did,
        address newVerificationKey
    )
        external
        onlyExisting(_hashDID(did))
        onlyActive(_hashDID(did))
        onlyController(_hashDID(did))
    {
        if (newVerificationKey == address(0)) {
            revert InvalidVerificationKey();
        }

        bytes32 didHash = _hashDID(did);

        address previousKey =
            _documents[didHash].verificationKey;

        if (previousKey == newVerificationKey) {
            revert SameKey();
        }

        _documents[didHash].verificationKey =
            newVerificationKey;

        _documents[didHash].updatedAt =
            block.timestamp;

        emit KeyRotated(
            didHash,
            previousKey,
            newVerificationKey
        );

        auditLogger.recordAudit(
            msg.sender,
            KEY_ROTATED,
            IDENTITY_RESOURCE,
            didHash,
            true
        );
    }

    function updateController(
        string calldata did,
        address newController
    )
        external
        onlyExisting(_hashDID(did))
        onlyActive(_hashDID(did))
        onlyController(_hashDID(did))
    {
        if (newController == address(0)) {
            revert InvalidController();
        }

        bytes32 didHash = _hashDID(did);

        address previousController =
            _documents[didHash].controller;

        if (previousController == newController) {
            revert SameController();
        }

        _documents[didHash].controller =
            newController;

        _documents[didHash].updatedAt =
            block.timestamp;

        emit ControllerUpdated(
            didHash,
            previousController,
            newController
        );

        auditLogger.recordAudit(
            msg.sender,
            CONTROLLER_UPDATED,
            IDENTITY_RESOURCE,
            didHash,
            true
        );
    }

    function revokeDID(
        string calldata did
    )
        external
        onlyExisting(_hashDID(did))
        onlyActive(_hashDID(did))
        onlyController(_hashDID(did))
    {
        bytes32 didHash = _hashDID(did);

        _documents[didHash].status =
            Status.Revoked;

        _documents[didHash].updatedAt =
            block.timestamp;

        emit DIDRevoked(
            didHash,
            msg.sender
        );

        auditLogger.recordAudit(
            msg.sender,
            DID_REVOKED,
            IDENTITY_RESOURCE,
            didHash,
            true
        );
    }

    function isActive(
        string calldata did
    )
        external
        view
        returns (bool)
    {
        return
            _documents[_hashDID(did)].status ==
            Status.Active;
    }

    function _hashDID(
        string calldata did
    )
        private
        pure
        returns (bytes32)
    {
        if (bytes(did).length == 0) {
            revert InvalidDID();
        }

        return keccak256(bytes(did));
    }
}