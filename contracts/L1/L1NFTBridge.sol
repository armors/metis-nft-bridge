// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { IStandarERC721 } from "../IStandarERC721.sol";
import { IStandarERC1155 } from "../IStandarERC1155.sol";

import { CrossDomainEnabled } from "../gateway/CrossDomainEnabled.sol";

import { INFTBridge } from "../INFTBridge.sol";
import { INFTDeposit } from "../INFTDeposit.sol";

import { console } from "../console.sol";

contract L1NFTBridge is AccessControl, CrossDomainEnabled {
    
    

    // configNFT role
    bytes32 public constant NFT_FACTORY_ROLE = keccak256("NFT_FACTORY_ROLE");

    // l2 bridge
    address public destNFTBridge;
    
    // l1 nft deposit
    address public localNFTDeposit;
    
    // pre deploy
    address public addressManager;
    
    // L2 chainid
    uint256 constant public DEST_CHAINID = 1088;
    
    // get current chainid
    function getChainID() internal view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    // nft supported[ 0, 1 ]
    enum nftenum {
        ERC721, 
        ERC1155
    }

    // L1 nft => L2 nft
    mapping(address => address) public clone;
    
    // L1 nft => is the original
    mapping(address => bool) public isOrigin;

    // L1 nft => L1 nft id => is the deposited
    mapping(address => mapping( uint256 => bool )) public isDeposit;

    // Not allow contract
    modifier onlyEOA() {
        require(!Address.isContract(msg.sender), "Account not EOA");
        _;
    }

    modifier requireDestGas(uint256 destGas){
        _;
    }

    /**
     *  @param _owner admin role
     *  @param _nftFactory factory role
     *  @param _addressManager pre deploy Lib_AddressManager
     *  @param _localMessenger pre deploy messenger
     */
    constructor(address _owner, address _nftFactory, address _addressManager, address _localMessenger) CrossDomainEnabled(_localMessenger) {
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
        _setupRole(NFT_FACTORY_ROLE, _nftFactory);
        addressManager = _addressManager;
    }

    /** config 
     * 
     * @param _localNFTDeposit L1 deposit
     * @param _destNFTBridge L2 bridge
     */
    function set(address _localNFTDeposit, address _destNFTBridge) public onlyRole(DEFAULT_ADMIN_ROLE){
        localNFTDeposit = _localNFTDeposit;
        destNFTBridge = _destNFTBridge;
    }
    
    /** factory role config nft clone
     * 
     * @param localNFT nft on this chain
     * @param destNFT nft on L2
     * @param originNFTChainId origin NFT ChainId 
     * @param destGas L2 gas
     */
    function configNFT(address localNFT, address destNFT, uint256 originNFTChainId, uint32 destGas) external payable onlyRole(NFT_FACTORY_ROLE) requireDestGas(destGas) {
        clone[localNFT] = destNFT;
        
        uint256 localChainId = getChainID();
        require((originNFTChainId == DEST_CHAINID || originNFTChainId == localChainId), "ChainId not supported");

        isOrigin[localNFT] = false;
        if(localChainId == originNFTChainId){
            isOrigin[localNFT] = true;
        }

        bytes memory message = abi.encodeWithSelector(
            INFTBridge.configNFT.selector,
            localNFT,
            destNFT,
            originNFTChainId
        );
        
        sendCrossDomainMessageViaChainId(
            DEST_CHAINID,
            destNFTBridge,
            destGas,
            message,
            msg.value
        );

        console.log("console: %s %s %s %s", localNFT, destNFT, originNFTChainId);
    }

    /** batch transfer 721 token
     * 
     * @param  tokenContract An ERC-721 contract
     * @param  recipient     Who gets the tokens?
     * @param  tokenIds      Which token IDs are transferred?
     */
    function ERC721BatchTransfer(address tokenContract, address recipient, uint256[] calldata tokenIds) internal {
        for (uint256 index; index < tokenIds.length; index++) {
            IERC721(tokenContract).safeTransferFrom(msg.sender, recipient, tokenIds[index]);
        }
    }

    /** deposit nft into L1 deposit
     * 
     * @param localNFT nft on this chain
     * @param destTo owns nft on L2
     * @param tokenIds nft id  
     * @param nftStandard nft type
     * @param destGas L2 gas
     */
    function depositTo(address localNFT, address destTo, uint256[] calldata tokenIds,  nftenum nftStandard, uint32 destGas) external onlyEOA() requireDestGas(destGas) payable {
       
        require(clone[localNFT] != address(0), "Config NFT cross-domain first.");

        uint256[] memory amounts;
        
        if(nftenum.ERC721 == nftStandard) {
            
            ERC721BatchTransfer(localNFT, localNFTDeposit, tokenIds);
            
            for (uint256 index; index < tokenIds.length; index++) {
                isDeposit[localNFT][tokenIds[index]] = true;
            }
        }
       
        if(nftenum.ERC1155 == nftStandard) {
            address[] memory owners;
            for (uint256 index; index < tokenIds.length; index++) {
                isDeposit[localNFT][tokenIds[index]] = true;
                owners[index] = msg.sender;
            }
           
            amounts =  IERC1155(localNFT).balanceOfBatch(owners, tokenIds);

            IERC1155(localNFT).safeBatchTransferFrom(msg.sender, localNFTDeposit, tokenIds, amounts, "");
        }
    
        address destNFT = clone[localNFT];

        bytes memory message =  abi.encodeWithSelector(
            INFTBridge.finalizeDeposit.selector,
            destNFT,
            msg.sender,
            destTo,
            tokenIds,
            amounts,
            uint8(nftStandard)
        );
        
        sendCrossDomainMessageViaChainId(
            DEST_CHAINID,
            destNFTBridge,
            destGas,
            message,
            msg.value
        );
    }

    /** clone nft
     *
     * @param  _localNFT nft
     * @param  _destFrom  owns nft on l2 
     * @param  _localTo give to
     * @param  _tokenIds nft ids
     * @param  _amounts nft amounts
     * @param  nftStandard nft type
     */
    function finalizeDeposit(address _localNFT, address _destFrom, address _localTo, uint256[] calldata _tokenIds, uint256[] calldata _amounts, nftenum nftStandard) external virtual onlyFromCrossDomainAccount(destNFTBridge) {
        
        if(clone[_localNFT] == address(0)){
            // TODO fail event
        }

        uint256[] memory withdrawIds;
        uint256[] memory mintIds;

        uint256[] memory withdrawAmounts;
        uint256[] memory mintAmounts;

        for (uint256 index; index < _tokenIds.length; index++) {
            if(isDeposit[_localNFT][_tokenIds[index]]){
                withdrawIds[index] = _tokenIds[index];
                withdrawAmounts[index] = _amounts[index];
            }else{
                mintIds[index] = _tokenIds[index];
                mintAmounts[index] = _amounts[index];
            }
        }

        if(nftenum.ERC721 == nftStandard) {
            if(withdrawIds.length > 0){
                INFTDeposit(localNFTDeposit).batchWithdrawERC721(_localNFT, _localTo, withdrawIds);
            }
            if(mintIds.length > 0){
                IStandarERC721(_localNFT).batchMint(_localTo, mintIds);
            }
        }

        if(nftenum.ERC1155 == nftStandard) {
            if(withdrawIds.length > 0){
                INFTDeposit(localNFTDeposit).batchWithdrawERC1155(_localNFT, _localTo, withdrawIds, withdrawAmounts);
            }else{
                IStandarERC1155(_localNFT).batchMint(_localTo, withdrawIds, withdrawAmounts, "");
            }
        }
    }
}
