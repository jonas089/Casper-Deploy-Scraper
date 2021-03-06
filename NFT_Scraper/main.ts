// CONFIG AND ENV
import { config } from "dotenv";
config({ path: ".env.jnft" });

//import {IDS} from "";
import {GET_IDS} from "./Scraper.js"

// import Client and EventParser from node_modules
import { CEP47Client, CEP47Events, CEP47EventParser } from "casper-cep47-js-client";

// import stuff from utils.ts
import { parseTokenMeta, sleep, getDeploy, getAccountInfo, getAccountNamedKeyValue } from "./utils";

// import dependencies from SDK
import {
  CLValueBuilder,
  Keys,
  CLPublicKey,
  CLAccountHash,
  CLPublicKeyType,
  DeployUtil,
  EventStream,
  EventName,
  CLValueParsers,
  CLMap,
} from "casper-js-sdk";

// Constants defined in .env.jnft
const {
  NODE_ADDRESS,
  EVENT_STREAM_ADDRESS,
  CHAIN_NAME,
  MASTER_KEY_PAIR_PATH,
  USER_KEY_PAIR_PATH,
  TOKEN_NAME,
  CONTRACT_NAME,
  TOKEN_SYMBOL,
  CONTRACT_HASH,
  INSTALL_PAYMENT_AMOUNT,
  MINT_ONE_PAYMENT_AMOUNT,
  MINT_COPIES_PAYMENT_AMOUNT,
  TRANSFER_ONE_PAYMENT_AMOUNT,
  BURN_ONE_PAYMENT_AMOUNT,
  MINT_ONE_META_SIZE,
  MINT_COPIES_META_SIZE,
  MINT_COPIES_COUNT,
  MINT_MANY_META_SIZE,
  MINT_MANY_META_COUNT,
} = process.env;

// nano .env.jnft
const KEYS = Keys.Ed25519.parseKeyFiles(
  `${MASTER_KEY_PAIR_PATH}/public_key.pem`,
  `${MASTER_KEY_PAIR_PATH}/secret_key.pem`
);

const KEYS_USER = Keys.Ed25519.parseKeyFiles(
  `${USER_KEY_PAIR_PATH}/public_key.pem`,
  `${USER_KEY_PAIR_PATH}/secret_key.pem`
);



// [ FUNCTIONS ]

/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////


// NOT YET FULLY INTEGRATED.
async function Mint_Copy(id, key, value){
  let streamer = await initialize();
  let es = streamer['event_stream'];
  let cep47 = streamer['cep47_client'];
  es.start();
  const mintCopiesDeploy = await cep47.mintCopies(
    KEYS.publicKey,
    [id.toString()],
    new Map([[key.toString(), value.toString()]]),
    1,
    MINT_COPIES_PAYMENT_AMOUNT!,
    KEYS.publicKey,
    [KEYS]
  );

  const mintCopiesDeployHash = await mintCopiesDeploy.send(NODE_ADDRESS!);

  console.log("...... Mint deploy hash: ", mintCopiesDeployHash);

  await getDeploy(NODE_ADDRESS!, mintCopiesDeployHash);
  console.log("...... Token minted successfully");
  es.stop();
}


// SHOULD BE FULLY INTEGRATED. // RETURNS ALL OWNED NFTs OF GIVEN COLLECTION
// JSON SCHEMA [id, metadata] => LATER: ALL RELEVANT INFO FOR JPG COLLECTION
// REQUIRES A COMMUNITY STANDARD
export async function Balance(account_hash, collection_contract_hash){
  let streamer = await initialize();
  let es = streamer['event_stream'];
  let cep47 = streamer['cep47_client'];
  es.start();
  var _IDS = await GET_IDS(account_hash, collection_contract_hash);
  let OWNED = [] // append with owned nfts ( [id, metadata] )
  for (let _id in _IDS){
    let id = _IDS[_id];
    // do something with the ID //
    // Get Metadata of id:

    // ! ERROR ! This does not work with ID #1 !!!!
    const tokenMeta = await cep47.getTokenMeta(id.toString());
    const _owned = [id, tokenMeta];

    OWNED.push(_owned);
  }
  es.stop();
  return OWNED;
}

// TO BE DONE: TRANSFER_FROM

// TO BE DONE: BURN

/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////

async function initialize(){
  const cep47 = new CEP47Client(
    NODE_ADDRESS!,
    CHAIN_NAME!
  );

  let accountInfo = await getAccountInfo(NODE_ADDRESS!, KEYS.publicKey);

  console.log(`... Account Info: `);
  console.log(JSON.stringify(accountInfo, null, 2));

  const contractHash = await getAccountNamedKeyValue(
    accountInfo,
    `${CONTRACT_NAME!}_contract_hash`
  );

  const contractPackageHash = await getAccountNamedKeyValue(
    accountInfo,
    `contract_package_hash`
  );

  await cep47.setContractHash(contractHash, contractPackageHash);

  await sleep(5 * 1000);

  const es = new EventStream(EVENT_STREAM_ADDRESS!);

  es.subscribe(EventName.DeployProcessed, (event) => {
    const parsedEvents = CEP47EventParser({
      contractPackageHash,
      eventNames: [
        CEP47Events.MintOne,
        CEP47Events.TransferToken,
        CEP47Events.BurnOne,
        CEP47Events.MetadataUpdate,
        CEP47Events.ApproveToken
      ]
    }, event);

    if (parsedEvents && parsedEvents.success) {
      console.log("*** EVENT ***");
      console.log(parsedEvents.data);
      console.log("*** ***");
    }
  });

  let result = {'event_stream':es, 'cep47_client':cep47};

  return result;
  //es.start();
  //console.log(await Balance(es, cep47));
  // last id = 10
  /*console.log(await Mint_Copy(12, es, cep47));
  console.log(await Balance(es, cep47));*/

  //console.log(await Mint_Copy(12, "NFT 02", "JPG 02", es, cep47));

  //console.log(await Balance(es, cep47));
  //es.stop();
}
/*
async function tests(){
  console.log(await Balance());
}

tests();
*/
