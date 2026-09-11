// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface IDIDRegistry {
    function isActive(string calldata did)
        external
        view
        returns (bool);

    function getDIDHash(string calldata did)
        external
        pure
        returns (bytes32);
}

interface IPolicyEngine {
    function checkAccess(
        address subject,
        bytes32 resourceId,
        bytes32 actionId
    )
        external
        returns (bool allowed);
}

interface IAuditLogger {
    function recordAudit(
        address actor,
        bytes32 action,
        bytes32 resourceType,
        bytes32 resourceId,
        bool success
    ) external;
}

/**
 * @title AssetNFT
 * @notice Generic NFT-based digital asset management layer for TrustMesh.
 *
 * Organisations define their own users, roles, permissions and assets.
 * TrustMesh provides reusable identity, authorization, ownership
 * and audit infrastructure.
 */
contract AssetNFT is ERC721, AccessControl {
    bytes32 public constant ASSET_ADMIN_ROLE =
        keccak256("ASSET_ADMIN_ROLE");

    bytes32 public constant ASSET_RESOURCE =
        keccak256("ASSET");

    bytes32 public constant MINT_ACTION =
        keccak256("MINT");

    bytes32 public constant TRANSFER_ACTION =
        keccak256("TRANSFER");

    bytes32 public constant ASSET_MINTED =
        keccak256("ASSET_MINTED");

    bytes32 public constant ASSET_TRANSFERRED =
        keccak256("ASSET_TRANSFERRED");

    IDIDRegistry public immutable didRegistry;
    IPolicyEngine public immutable policyEngine;
    IAuditLogger public immutable auditLogger;

    uint256 private _nextTokenId = 1;

    struct Asset {
        bytes32 didHash;
        string metadataURI;
        bool exists;
    }

    mapping(uint256 => Asset) private _assets;

    event AssetMinted(
        uint256 indexed tokenId,
        address indexed owner,
        bytes32 indexed didHash,
        string metadataURI
    );

    event AssetTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        bytes32 didHash
    );

    constructor(
        address admin,
        address didRegistryAddress,
        address policyEngineAddress,
        address auditLoggerAddress
    )
        ERC721("TrustMesh Asset", "TMA")
    {
        require(
            admin != address(0),
            "Invalid admin"
        );

        require(
            didRegistryAddress != address(0),
            "Invalid DID registry"
        );

        require(
            policyEngineAddress != address(0),
            "Invalid policy engine"
        );

        require(
            auditLoggerAddress != address(0),
            "Invalid audit logger"
        );

        didRegistry =
            IDIDRegistry(didRegistryAddress);

        policyEngine =
            IPolicyEngine(policyEngineAddress);

        auditLogger =
            IAuditLogger(auditLoggerAddress);

        _grantRole(
            DEFAULT_ADMIN_ROLE,
            admin
        );

        _grantRole(
            ASSET_ADMIN_ROLE,
            admin
        );
    }

    function mintAsset(
        address to,
        string calldata did,
        string calldata metadataURI
    )
        external
        onlyRole(ASSET_ADMIN_ROLE)
        returns (uint256)
    {
        require(
            to != address(0),
            "Invalid recipient"
        );

        require(
            bytes(did).length > 0,
            "Invalid DID"
        );

        require(
            didRegistry.isActive(did),
            "DID does not exist"
        );

        require(
            bytes(metadataURI).length > 0,
            "Metadata required"
        );

        require(
            policyEngine.checkAccess(
                msg.sender,
                ASSET_RESOURCE,
                MINT_ACTION
            ),
            "Mint permission denied"
        );

        bytes32 didHash =
            didRegistry.getDIDHash(did);

        uint256 tokenId =
            _nextTokenId;

        _nextTokenId++;

        _safeMint(
            to,
            tokenId
        );

        _assets[tokenId] = Asset({
            didHash: didHash,
            metadataURI: metadataURI,
            exists: true
        });

        emit AssetMinted(
            tokenId,
            to,
            didHash,
            metadataURI
        );

        auditLogger.recordAudit(
            msg.sender,
            ASSET_MINTED,
            ASSET_RESOURCE,
            bytes32(tokenId),
            true
        );

        return tokenId;
    }

    function assetDID(
        uint256 tokenId
    )
        external
        view
        returns (bytes32)
    {
        require(
            _assetExists(tokenId),
            "Asset does not exist"
        );

        return _assets[tokenId].didHash;
    }

    function assetMetadata(
        uint256 tokenId
    )
        external
        view
        returns (string memory)
    {
        require(
            _assetExists(tokenId),
            "Asset does not exist"
        );

        return _assets[tokenId].metadataURI;
    }

    function getAsset(
        uint256 tokenId
    )
        external
        view
        returns (
            bytes32 didHash,
            string memory metadataURI,
            address owner
        )
    {
        require(
            _assetExists(tokenId),
            "Asset does not exist"
        );

        Asset memory asset =
            _assets[tokenId];

        return (
            asset.didHash,
            asset.metadataURI,
            ownerOf(tokenId)
        );
    }

    function assetExists(
        uint256 tokenId
    )
        external
        view
        returns (bool)
    {
        return _assetExists(tokenId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        override
        returns (address)
    {
        address from =
            _ownerOf(tokenId);

        if (
            from != address(0) &&
            to != address(0)
        ) {
            require(
                policyEngine.checkAccess(
                    auth,
                    ASSET_RESOURCE,
                    TRANSFER_ACTION
                ),
                "Transfer permission denied"
            );
        }

        address previousOwner =
            super._update(
                to,
                tokenId,
                auth
            );

        if (
            from != address(0) &&
            to != address(0)
        ) {
            bytes32 didHash =
                _assets[tokenId].didHash;

            emit AssetTransferred(
                tokenId,
                from,
                to,
                didHash
            );

            auditLogger.recordAudit(
                auth,
                ASSET_TRANSFERRED,
                ASSET_RESOURCE,
                bytes32(tokenId),
                true
            );
        }

        return previousOwner;
    }

    function tokenURI(
        uint256 tokenId
    )
        public
        view
        override
        returns (string memory)
    {
        require(
            _assetExists(tokenId),
            "Asset does not exist"
        );

        return _assets[tokenId].metadataURI;
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(
            ERC721,
            AccessControl
        )
        returns (bool)
    {
        return super.supportsInterface(
            interfaceId
        );
    }

    function _assetExists(
        uint256 tokenId
    )
        internal
        view
        returns (bool)
    {
        return _assets[tokenId].exists;
    }
}