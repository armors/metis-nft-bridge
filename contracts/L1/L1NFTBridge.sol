// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { IStandarERC721 } from "../IStandarERC721.sol";
import { IStandarERC1155 } from "../IStandarERC1155.sol";

import { CrossDomainEnabled } from "../gateway/CrossDomainEnabled.sol";

import { ICrollDomain } from "../ICrollDomain.sol";
import { ICrollDomainConfig } from "../ICrollDomainConfig.sol";

import { CommonEvent } from "../CommonEvent.sol";

import { INFTDeposit } from "../INFTDeposit.sol";

import { iMVM_DiscountOracle } from "../gateway/iMVM_DiscountOracle.sol";
import { Lib_AddressManager } from "../gateway/Lib_AddressManager.sol";

contract L1NFTBridge is CrossDomainEnabled, AccessControl, CommonEvent {

    // L1 configNFT role
    bytes32 public constant NFT_FACTORY_ROLE = keccak256("NFT_FACTORY_ROLE");

    // L2 bridge
    address public destNFTBridge;
    
    // L1 deposit
    address public localNFTDeposit;
    
    // L1 preset address manager
    address public addressManager;
    
    // L1 preset oracle
    iMVM_DiscountOracle public oracle;

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

    // L1 nft => L1 nft id => is deposited
    mapping(address => mapping( uint256 => bool )) public isDeposit;

    modifier onlyEOA() {
        require(!Address.isContract(msg.sender), "Account not EOA");
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
        oracle = iMVM_DiscountOracle(Lib_AddressManager(addressManager).getAddress('MVM_DiscountOracle'));
    }
    
    /** config 
     * 
     * @param _localNFTDeposit L1 deposit
     * @param _destNFTBridge L2 bridge
     */
    function set(address _localNFTDeposit, address _destNFTBridge) public onlyRole(DEFAULT_ADMIN_ROLE){
        
        require(destNFTBridge == address(0), "Already configured.");

        localNFTDeposit = _localNFTDeposit;
        destNFTBridge = _destNFTBridge;
        
        emit EVENT_SET(localNFTDeposit, destNFTBridge);
    }
    
    /** factory role config nft clone
     * 
     * @param localNFT nft on this chain
     * @param destNFT nft on L2
     * @param originNFTChainId origin NFT ChainId 
     * @param destGasLimit L2 gas
     */
    function configNFT(address localNFT, address destNFT, uint256 originNFTChainId, uint32 destGasLimit) external payable onlyRole(NFT_FACTORY_ROLE) {

        uint256 localChainId = getChainID();
    
        require((originNFTChainId == DEST_CHAINID || originNFTChainId == localChainId), "ChainId not supported");

        require(clone[localNFT] == address(0), "NFT already configured.");

        uint32 minGasLimit = uint32(oracle.getMinL2Gas());
        if (destGasLimit < minGasLimit) {
            destGasLimit = minGasLimit;
        }
        // TODO
        // require(destGasLimit * oracle.getDiscount() <= msg.value, string(abi.encodePacked("insufficient fee supplied. send at least ", uint2str(destGasLimit * oracle.getDiscount()))));

        clone[localNFT] = destNFT;

        isOrigin[localNFT] = false;
        if(localChainId == originNFTChainId){
            isOrigin[localNFT] = true;
        }

        bytes memory message = abi.encodeWithSelector(
            ICrollDomainConfig.configNFT.selector,
            localNFT,
            destNFT,
            originNFTChainId
        );
        
        sendCrossDomainMessageViaChainId(
            DEST_CHAINID,
            destNFTBridge,
            destGasLimit,
            message,
            msg.value
        );

         emit CONFIT_NFT(localNFT, destNFT, originNFTChainId);
    }

    /** deposit nft into L1 deposit
     * 
     * @param localNFT nft on this chain
     * @param destTo owns nft on L2
     * @param id nft id  
     * @param nftStandard nft type
     * @param destGasLimit L2 gas limit
     */
    function depositTo(address localNFT, address destTo, uint256 id,  nftenum nftStandard, uint32 destGasLimit) external onlyEOA() payable {
       
        uint32 minGasLimit = uint32(oracle.getMinL2Gas());
        if (destGasLimit < minGasLimit) {
            destGasLimit = minGasLimit;
        }
        // TODO
        // require(destGasLimit * oracle.getDiscount() <= msg.value, string(abi.encodePacked("insufficient fee supplied. send at least ", uint2str(destGasLimit * oracle.getDiscount()))));
        
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

       _messenger(DEST_CHAINID, destNFT, msg.sender, destTo, id, amount, uint8(nftStandard), destGasLimit);

        emit DEPOSIT_TO(destNFT, msg.sender, destTo, id, amount, uint8(nftStandard));
    }

    /** deposit messenger
     * 
     * @param chainId L2 chainId
     * @param destNFT nft on L2
     * @param from msg.sender
     * @param destTo owns nft on L2
     * @param id nft id  
     * @param amount amount
     * @param nftStandard nft type
     * @param destGasLimit L2 gas
     */
    function _messenger(uint256 chainId, address destNFT, address from, address destTo, uint256 id, uint256 amount, uint8 nftStandard, uint32 destGasLimit) internal {

        bytes memory message =  abi.encodeWithSelector(
            ICrollDomain.finalizeDeposit.selector,
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
            destGasLimit,
            message,
            msg.value
        );
    }
    
    /** clone nft
     *
     * @param  _localNFT nft
     * @param  _destFrom  owns nft on l2 
     * @param  _localTo give to
     * @param  id nft id
     * @param  _amount nft amount
     * @param  nftStandard nft type
     */
    function finalizeDeposit(address _localNFT, address _destFrom, address _localTo, uint256 id, uint256 _amount, nftenum nftStandard) external onlyFromCrossDomainAccount(destNFTBridge) {
        
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
        emit FINALIZE_DEPOSIT(_localNFT, _destFrom, _localTo, id, _amount, uint8(nftStandard));
    }

    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
