// truffle.js config for klaytn.
const PrivateKeyConnector = require('connect-privkey-to-provider')
const NETWORK_ID = '1001'
const GASLIMIT = '20000000'
const URL = 'https://api.baobab.klaytn.net:8651'
const PRIVATE_KEY = '0x270c77a5676ff167567ca278e31cb32032b771e9072f0f56dea49a72e4e81eba'

module.exports = {
    networks : {
        klaytn : {
            provider : new PrivateKeyConnector(PRIVATE_KEY,URL),
            network_id : NETWORK_ID,
            gas : GASLIMIT,
            gasPrice : null, // 자동
        }
    },
}