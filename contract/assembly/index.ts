import { u128, context, logging, ContractPromiseBatch } from "near-sdk-as";
import { add_event, Event, EVENT_STORAGE_COST } from "./models/event";
import { add_program, get_beneficiary, get_program, PROGRAM_STORAGE_COST, redeem_from_balance, set_beneficiary, top_up } from "./models/program";

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
  amount: u128, 
  learner_id: string
): void {
  // only contract deployer can call
  assert(context.predecessor == context.contractName, "Method process_events is private");
  const total_amount = u128.add(EVENT_STORAGE_COST, amount)
  // assert enough money was attached to at least event process (reward + storage)
  assert(context.attachedDeposit > total_amount , `Attach at least ${total_amount}`)
  
  // subtract amount from balance
  redeem_from_balance(program_id, total_amount)
  
  // transfer amount to learner
  const beneficiary: string = learner_id;
  ContractPromiseBatch.create(beneficiary).transfer(amount)
  
  // add event metadata on-chain
  add_event(id, event_subevent, program_id, amount, learner_id)
}

// Public - withdraw all balance from contract to creator
export function init_program(
  program_id: string,
): void {
  // assert enough money was attached to at least cover the storage
  assert(context.attachedDeposit > PROGRAM_STORAGE_COST , `Attach at least ${PROGRAM_STORAGE_COST}`)
  assert(!get_program(program_id), `program_id: ${program_id} already exists`)
  
  const creator_id = context.predecessor;
  
  add_program(program_id, creator_id)
}

// Public - withdraw all balance from contract to creator
export function top_up_program(
  program_id: string,
  amount: i32,
): void {
  const amount_u128 = u128.from(amount);
  // assert enough money was attached to at least cover the storage
  assert(context.attachedDeposit > amount_u128 , `Attach at least ${amount_u128}`)
  
  // anyone can top up any program
  
  // transfer amount to learner
  const beneficiary: string = get_beneficiary();
  ContractPromiseBatch.create(beneficiary).transfer(amount_u128)
  
  // increment balance
  top_up(program_id, amount_u128);
}

// Public - withdraw all balance from contract to creator
export function withdraw_program(
    program_id: string,
): void {
  const program = assert(get_program(program_id), `program_id: ${program_id} does not exist`)
  
  // only creator can withdraw
  assert(program.creator === context.predecessor, `Only program creator can withdraw`)
  
  // transfer amount to the creator
  // TODO: verify
  ContractPromiseBatch.create(program.creator).transfer(program.balance)
  
  redeem_from_balance(program_id, program.balance);
}

// // Public - donate
// export function donate(): i32 {
//   // assert enough money was attached to at least cover the storage
//   assert(context.attachedDeposit > STORAGE_COST, `Attach at least ${STORAGE_COST}`)

//   // Get who is calling the method, and how much NEAR they attached
//   const donor: string = context.predecessor;
//   const amount: u128 = context.attachedDeposit;

//   // Record the donation
//   const donation_number: i32 = add_donation(donor, amount);
//   logging.log(`Thank you ${donor}! donation number: ${donation_number}`);

//   // Send the money to the beneficiary
//   const beneficiary: string = get_beneficiary();
//   ContractPromiseBatch.create(beneficiary).transfer(amount - STORAGE_COST);

//   return donation_number;
// }

// // Public - get donation by number
// export function get_donation_by_number(donation_number: i32): Donation {
//   return get_donation(donation_number);
// }

// // Public - get total number of donations
// export function total_number_of_donation(): i32 {
//   return total_donations();
// }

// // Public - get a range of donations
// export function get_donation_list(from: i32, until: i32): Array<Donation> {
//   let result: Array<Donation> = new Array<Donation>();
//   for (let i: i32 = from; i <= until; i++) {
//     result.push(get_donation(i));
//   }
//   return result;
// }