const { ethers } = require('ethers');

const ABI = require('../../ABI/abi.json');

class BlockchainService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
        this.contractAddress = process.env.CONTRACT_ADDRESS;
        this.privateKey = process.env.ADMIN_PRIVATE_KEY;
        
        if (this.privateKey && this.contractAddress) {
            this.wallet = new ethers.Wallet(this.privateKey, this.provider);
            this.contract = new ethers.Contract(this.contractAddress, ABI, this.wallet);
            console.log('✅ Blockchain Service Initialized for Base Sepolia');
        } else {
            console.warn('⚠️ Blockchain Service skipped: CONTRACT_ADDRESS or ADMIN_PRIVATE_KEY missing in .env');
        }
    }

    async logRemarkOnChain(driverId, remark) {
        if (!this.contract) return null;
        
        try {
            console.log(`🔗 Broadcasting remark for ${driverId} to Base Sepolia...`);
            const tx = await this.contract.addRemark(driverId, remark);
            const receipt = await tx.wait();
            console.log(`✅ Transaction Confirmed: ${receipt.hash}`);
            return receipt.hash;
        } catch (error) {
            console.error('❌ Blockchain logging failed:', error.message);
            return null;
        }
    }
}

module.exports = new BlockchainService();
