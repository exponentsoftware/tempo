import { u128, context, logging, ContractPromiseBatch, ContractPromise, PersistentUnorderedMap } from "near-sdk-as";
import { add_event, Event, EVENT_STORAGE_COST } from "./models/event";
import { add_program, get_beneficiary, get_program, ProgramConfig, PROGRAM_STORAGE_COST, redeem_from_balance, set_beneficiary, top_up } from "./models/program";

type Gas = u64;
const XCC_GAS: Gas = 20_000_000_000_000;

// consider using subaccounts for each program
// https://github.com/Learn-NEAR/NCD.L1.sample--meme-museum/blob/8c5d025d363f89fdcc7335d58d61a8e3307cd95a/src/museum/assembly/index.ts#L63-L103

// Public - init function, define the beneficiary of programs
export function init(beneficiary: string): void {
  // only contract deployer can call
  assert(context.predecessor == context.contractName, "Method new is private");
  set_beneficiary(beneficiary);
}

// Public - beneficiary getter
export function beneficiary(): string {
  return get_beneficiary();
}

// Public - beneficiary setter
export function change_beneficiary(beneficiary: string): void {
  assert(context.predecessor == context.contractName, "Method change_beneficiary is private")
  set_beneficiary(beneficiary);
}

export function process_events(
  id: string,
  event_subevent: string,
  program_id: string,
  learner_id: string
): void {
  // only contract deployer can call
  assert(context.predecessor == context.contractName, "Method process_events is private");
  
  const prgm = get_program(program_id)!;
  const event_config = prgm.config.get(event_subevent)!;
  
  const total_amount = u128.add(EVENT_STORAGE_COST, event_config.amount)
  // assert enough money was attached to at least event process (reward + storage)
  assert(context.attachedDeposit > total_amount, `Attach at least ${total_amount}`)

  assert(u128.gt(event_config.limit, u128.from(0)), `limit is exceeded ${total_amount}`)
  

  // subtract amount from balance
  redeem_from_balance(program_id, total_amount)

  // transfer amount to learner
  const beneficiary: string = learner_id;
  ContractPromiseBatch.create(beneficiary).transfer(amount)
  
  // decrease the limit
  

  // add event metadata on-chain
  add_event(id, event_subevent, program_id, '' learner_id)
}

// Public - initialize program
export function init_program(
  program_id: string,
  config: PersistentUnorderedMap<string, ProgramConfig>,
): void {
  // assert enough money was attached to at least cover the storage
  assert(context.attachedDeposit > PROGRAM_STORAGE_COST, `Attach at least ${PROGRAM_STORAGE_COST}`)
  assert(get_program(program_id), `program_id: ${program_id} already exists`)

  add_program(program_id, context.predecessor, config);
}

// Public - add funds to existing program
export function top_up_program(
  program_id: string,
  // amount: i32,
): void {
  // const amount_u128 = u128.from(amount);
  // assert enough money was attached to at least cover the storage
  // assert(context.attachedDeposit > amount_u128, `Attach at least ${amount_u128}`)
  const attached_deposit = context.attachedDeposit
  assert(attached_deposit > u128.from(1), `Attach at least 1 N`)

  // anyone can top up any program

  // transfer amount to learner
  // const beneficiary: string = get_beneficiary();
  // ContractPromiseBatch.create(beneficiary).transfer(amount_u128)

  // increment balance
  top_up(program_id, attached_deposit);
}

// Public - withdraw all balance from contract to creator
export function withdraw_program(
  program_id: string,
): boolean {
  const program = get_program(program_id);

  // only creator can withdraw
  assert(program && program.creator === context.predecessor, `Only program creator can withdraw`)

  // transfer amount to the creator
  // TODO: verify
  if (program) {
    // assert that there are no pending payouts for people that have triggered rewardable events
    // for this program
    const pending = false // would be set by checking the above statement
    if (pending) {
      return false
    } else {
      // execute refund

      // begin the transfer
      ContractPromiseBatch.create(program.creator).transfer(program.balance)


      const to_creator = ContractPromiseBatch.create(program.creator);
      const self = context.contractName

      // refund balance to creator
      to_creator.transfer(program.balance);

      // receive confirmation of payout before setting game to inactive
      // read more about cross contract calls (xcc)
      // https://github.com/near-examples/cross-contract-calls/tree/main/contracts/00.orientation
      to_creator.then(self).function_call("on_refund_complete", "{}", u128.Zero, XCC_GAS);
    }

    return true
  } else {
    return false
  }
}

// dor proper handling of cross-contract call to self -- test outcomes
// https://github.com/Learn-NEAR/NCD.L1.sample--meme-museum/blob/8c5d025d363f89fdcc7335d58d61a8e3307cd95a/src/museum/assembly/index.ts#L105-L130
export function on_refund_complete(): void {
  assert_self()
  let results = ContractPromise.getResults();
  let xcc = results[0];

  // Verifying the remote contract call succeeded.
  // https://nomicon.io/RuntimeSpec/Components/BindingsSpec/PromisesAPI.html?highlight=promise#returns-3
  switch (xcc.status) {
    case 0:
      // promise result is not complete
      logging.log("refund of *program* to *creator* in the amount of *balance* is PENDING")
      break;
    case 1:
      // promise result is complete and successful
      logging.log("refund of *program* to *creator* in the amount of *balance* has COMPLETED")
      // redeem_from_balance(program_id, program.balance);
      break;
    case 2:
      // promise result is complete and failed
      logging.log("refund of *program* to *creator* in the amount of *balance* has FAILED")
      break;

    default:
      logging.log("Unexpected value for promise result [" + memeCreated.status.toString() + "]");
      break;
  }
}


function assert_self(): void {
  const caller = context.predecessor
  const self = context.contractName
  assert(caller == self, "Only this contract may call itself");
}
