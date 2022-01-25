// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title IL2NFTBridge
 */
interface IL2NFTBridge {
    /**********
     * Events *
     **********/

    event DepositFinalized(
        address indexed _l1NFT,
        address indexed _l2NFt,
        address indexed _from,
        address _to,
        uint256 _amount,
        uint8 _nftStandard,
        bytes _data
    );

    event DepositFailed(
        address indexed _l1NFT,
        address indexed _l2NFT,
        address indexed _from,
        address _to,
        uint8 _nftStandard,
        uint256 _amount,
        bytes _data
    );

    function configNFT(
        address L1NFT, 
        address L2NFT, 
        uint256 originNFTChainId
    ) 
        external;
        
    // function finalizeDeposit(
    //     address nftL2, 
    //     address to,
    //     uint256 id,
    //     address _from,
    //     address _to,
    //     uint256 _amount,
    //     bytes calldata _data
    // ) external;
}
