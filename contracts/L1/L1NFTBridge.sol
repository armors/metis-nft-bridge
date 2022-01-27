// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { IStandarERC721 } from "../IStandarERC721.sol";
import { IStandarERC1155 } from "../IStandarERC1155.sol";

import { CrossDomainEnabled } from "../gateway/CrossDomainEnabled.sol";
import { iMVM_DiscountOracle } from "../gateway/iMVM_DiscountOracle.sol";
import { Lib_AddressManager } from "../gateway/Lib_AddressManager.sol";

import { INFTBridge } from "../INFTBridge.sol";
import { INFTDeposit } from "../INFTDeposit.sol";

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

    // nft supported
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

    modifier onlyEOA() {
        require(!Address.isContract(msg.sender), "Account not EOA");
        _;
    }

    constructor(address _owner, address _nftFactory, address _addressManager, address _localMessenger) CrossDomainEnabled(_localMessenger) {
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
        _setupRole(NFT_FACTORY_ROLE, _nftFactory);
        addressManager = _addressManager;
    }
    
    function set(address _localNFTDeposit, address _destNFTBridge) public onlyRole(DEFAULT_ADMIN_ROLE){
        localNFTDeposit = _localNFTDeposit;
        destNFTBridge = _destNFTBridge;
    }
    
    function configNFT(address localNFT, address destNFT, uint256 originNFTChainId, uint32 destGas) external payable onlyRole(NFT_FACTORY_ROLE) {
        clone[localNFT] = destNFT;
        uint256 localChainId = getChainID();
        
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
    }

    function depositTo(address localNFT, address destTo, uint256 id,  nftenum nftStandard, uint32 destGas) external onlyEOA() {
       
       uint256 amount = 0;
       
       if(nftenum.ERC721 == nftStandard) {
            IERC721(localNFT).safeTransferFrom(msg.sender, localNFTDeposit, id);
       }
       
       if(nftenum.ERC1155 == nftStandard) {
            amount = IERC1155(localNFT).balanceOf(msg.sender, id);
            IERC1155(localNFT).safeTransferFrom(msg.sender, localNFTDeposit, id, amount, "");
       }
       
       isDeposit[localNFT][id] = true;
    
       address destNFT = clone[localNFT];

       _DepositByChainId(DEST_CHAINID, destNFT, msg.sender, destTo, id, amount, uint8(nftStandard), destGas);
    }

    function _DepositByChainId(uint256 chainId, address destNFT, address from, address destTo, uint256 id, uint256 amount, uint8 nftStandard, uint32 destGas) internal {

        bytes memory message =  abi.encodeWithSelector(
            INFTBridge.finalizeDeposit.selector,
            destNFT,
            from,
            destTo,
            id,
            amount,
            nftStandard
        );
        
        sendCrossDomainMessageViaChainId(
            chainId,
            destNFTBridge,
            destGas,
            message,
            msg.value
        );
    }
    
    function finalizeDeposit(address _localNFT, address _destfrom, address _localTo, uint256 id, uint256 _amount, nftenum nftStandard) external virtual onlyFromCrossDomainAccount(destNFTBridge) {
        
        if(nftenum.ERC721 == nftStandard) {
            if(isDeposit[_localNFT][id]){
                INFTDeposit(localNFTDeposit).withdrawERC721(_localNFT, _localTo, id);
            }else{
                IStandarERC721(_localNFT).mint(_localTo, id);
            }
        }

        if(nftenum.ERC1155 == nftStandard) {
            if(isDeposit[_localNFT][id]){
                INFTDeposit(localNFTDeposit).withdrawERC1155(_localNFT, _localTo, id, _amount);
            }else{
                IStandarERC1155(_localNFT).mint(_localTo, id, _amount, "");
            }
        }
    }
}
