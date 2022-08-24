import { storage, u128, PersistentUnorderedMap, logging } from "near-sdk-as";

// Class and vector holding donations
@nearBindgen
export class Program{
  constructor(
    public program_id: string, 
    public creator: string,
    public balance: u128, 
  ) { }
}

// Aprox. cost (u128 + string + string = 16b + 64b + 64b = 144b = 1440000000000000000000yN)
export const PROGRAM_STORAGE_COST: u128 = u128.from("2000000000000000000000")

const programs = new PersistentUnorderedMap<string, Program>("programs-v1")

// Beneficiary
export function set_beneficiary(beneficiary: string): void{
  storage.set<string>("beneficiary", beneficiary)
}

export function get_beneficiary(): string{
  return storage.getPrimitive<string>("beneficiary", "hivemind.testnet")
}

export function add_program(program_id: string, creator: string): i32 {
  const new_program: Program = new Program(program_id, creator, u128.from(0))
  programs.set(program_id, new_program);
  return programs.length
}

export function get_program(program_id: string): Program {
  const program = assert(programs.get(program_id), `invalid program_id: ${program_id}`)
  return program
}

// increment balance
export function top_up(program_id: string, amount: u128): i32 {
  const program = programs.get(program_id) as Program
  assert(program, `program_id ${program_id} is not valid`)
  
  const balance = program.balance
  program.balance = u128.add(balance, amount)

  return programs.length
}

// decrement balance, incase of processing event or withdraw
export function redeem_from_balance(program_id: string, amount: u128): i32 {
  const program = programs.get(program_id) as Program
  assert(program, `program_id ${program_id} is not valid`)

  const balance = program.balance
  const new_balance = u128.sub(balance, amount)
  
  assert(u128.gt(new_balance, u128.from(0)), "Not enough balance to redeem")
  
  program.balance = new_balance
  return programs.length
}

export function total_programs() : i32{
  return programs.length
}