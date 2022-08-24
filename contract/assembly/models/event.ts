import { u128, PersistentUnorderedMap } from "near-sdk-as";

// Class and vector holding events
@nearBindgen
export class Event{
  constructor(
    public id: string,
    public event_subevent: string,
    public program_id: string,
    public amount: u128,
    public learner_id: string,
  ) { }
}

// Aprox. cost (u128 + string (bytes) = 64 + 64 + 64 + 16 + 64 = 272b = ~ 2720000000000000000000yN)
export const EVENT_STORAGE_COST: u128 = u128.from("3000000000000000000000")

const events = new PersistentUnorderedMap<string, Event>("events-v1")

export function add_event(
  id: string, 
  event_subevent: string, 
  program_id: string, 
  amount: u128, 
  learner_id: string
): string {
  const new_event: Event = new Event(id, event_subevent, program_id, amount, learner_id);
  events.set(id, new_event);
  return id
}

export function get_event(id: string): Event {
  const event = assert(events.get(id), "Error: Invalid donation number")
  return event
}

export function total_events() : i32{
  return events.length
}