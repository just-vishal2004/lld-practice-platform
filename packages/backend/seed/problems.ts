import { ExpectedEntityHint, VariationPointHint } from '../src/domain/Problem';

export interface SeedProblem {
  slug: string;
  title: string;
  summary: string;
  requirements: string[];
  constraints: string[];
  expectedEntities: ExpectedEntityHint[];
  variationPoints: VariationPointHint[];
}

export const SEED_PROBLEMS: SeedProblem[] = [
  {
    slug: 'parking-lot',
    title: 'Parking Lot',
    summary:
      'Design a multi-level parking lot that can park and unpark vehicles of different sizes, track available spots, and calculate a parking fee.',
    requirements: [
      'The lot has multiple levels, each with a fixed number of spots of different sizes (e.g. motorcycle, compact, large).',
      'A vehicle can only park in a spot that fits its size (a motorcycle spot cannot hold a bus, but larger spots may accommodate smaller vehicles depending on your policy — state your assumption).',
      'The system can find an available spot for an incoming vehicle and mark it occupied.',
      'When a vehicle leaves, its spot becomes available again and a parking fee is calculated based on duration.',
      'The system can report how many spots of each size are currently free.',
    ],
    constraints: [
      'The lot is full: the system must handle "no available spot" without crashing.',
      'The same vehicle should not be able to park twice without leaving first.',
      'Fee calculation differs by vehicle size and/or duration — this is intentionally a variation point.',
    ],
    expectedEntities: [
      {
        label: 'Vehicle abstraction',
        synonyms: ['vehicle', 'car', 'motorcycle', 'truck', 'bus'],
        rationale: 'Without a Vehicle concept (or subtypes), spot-size matching and fee rules have nothing to key off of.',
        required: true,
      },
      {
        label: 'Parking Spot',
        synonyms: ['spot', 'parkingspot', 'space', 'slot'],
        rationale: 'The spot is what actually holds occupancy state and size — central to the whole problem.',
        required: true,
      },
      {
        label: 'Level / Floor',
        synonyms: ['level', 'floor', 'zone'],
        rationale: 'The problem explicitly states the lot has multiple levels; representing this affects how spots are organized and searched.',
        required: true,
      },
      {
        label: 'Ticket or parking session record',
        synonyms: ['ticket', 'session', 'parkingrecord', 'receipt'],
        rationale: 'Fee calculation needs an entry time and vehicle-to-spot association captured somewhere — usually a Ticket/Session concept.',
        required: false,
      },
      {
        label: 'ParkingLot orchestrator',
        synonyms: ['parkinglot', 'garage', 'lot'],
        rationale: 'Something needs to own the overall park/unpark workflow and coordinate levels and spots.',
        required: true,
      },
    ],
    variationPoints: [
      {
        label: 'Pricing strategy',
        extensibilitySignals: ['pricing', 'fee', 'rate', 'cost', 'billing', 'strategy'],
        rationale:
          'The requirements explicitly note fee calculation varies by vehicle size/duration and may change over time (e.g. weekday vs weekend rates); a hardcoded fee formula inside the core flow would need editing every time pricing changes.',
      },
      {
        label: 'Spot allocation / search strategy',
        extensibilitySignals: ['allocation', 'assign', 'search', 'findspot', 'spotfinder'],
        rationale:
          'How the lot picks which free spot to assign (nearest-first, size-exact-first, level-balancing) is a policy that reasonably varies and benefits from being isolated from the core park/unpark flow.',
      },
    ],
  },
  {
    slug: 'elevator',
    title: 'Elevator System',
    summary:
      'Design an elevator control system for a building with multiple elevators that can handle floor requests, movement, and door operations.',
    requirements: [
      'The building has multiple elevators and multiple floors.',
      'A user can request an elevator from a floor (up or down) and, once inside, select a destination floor.',
      'The system decides which elevator should service a given request.',
      'An elevator moves toward its next target floor one step at a time and opens/closes its doors at each stop.',
      'The system can report the current floor and direction/state of each elevator.',
    ],
    constraints: [
      'Multiple requests may be pending at once and must be served without being lost or served twice.',
      'An elevator that is already moving in a direction should reasonably prefer picking up requests along the way (you may simplify, but state your assumption).',
      'The strategy for choosing which elevator serves a request is intentionally a variation point.',
    ],
    expectedEntities: [
      {
        label: 'Elevator (car)',
        synonyms: ['elevator', 'lift', 'car'],
        rationale: 'The elevator car itself holds current floor, direction, door state, and its own request queue.',
        required: true,
      },
      {
        label: 'Floor / Hall request',
        synonyms: ['request', 'floorrequest', 'hallcall', 'call'],
        rationale: 'A request (from a hall button or an in-car button) is a distinct piece of data the system must track until served.',
        required: true,
      },
      {
        label: 'Elevator Controller / Dispatcher',
        synonyms: ['controller', 'dispatcher', 'elevatorsystem', 'manager'],
        rationale: 'Something must decide which of several elevators handles an incoming request — this coordination role is central to the problem.',
        required: true,
      },
      {
        label: 'Door',
        synonyms: ['door'],
        rationale: 'Door open/close is explicitly called out as required behaviour at each stop.',
        required: false,
      },
    ],
    variationPoints: [
      {
        label: 'Elevator selection / dispatch strategy',
        extensibilitySignals: ['dispatch', 'select', 'strategy', 'scheduling', 'algorithm'],
        rationale:
          'The assignment explicitly frames "which elevator serves a request" as a policy that could change (nearest-car, least-busy, zoned) — a natural Strategy pattern candidate.',
      },
      {
        label: 'Movement / direction strategy',
        extensibilitySignals: ['direction', 'movement', 'scan', 'lookalgorithm'],
        rationale: 'How an elevator orders its pending stops (e.g. SCAN/LOOK-style vs FIFO) is a swappable algorithm, not fixed business logic.',
      },
    ],
  },
  {
    slug: 'vending-machine',
    title: 'Vending Machine',
    summary:
      'Design a vending machine that stocks multiple products, accepts payment, dispenses the selected product, and returns change.',
    requirements: [
      'The machine stocks multiple products, each with a price and available quantity.',
      'A user selects a product, inserts payment (coins/notes or another method), and the machine validates whether payment covers the price.',
      'On sufficient payment, the machine dispenses the product and returns any change; on insufficient payment, it should indicate how much more is needed or allow cancellation.',
      'The machine tracks and updates inventory as products are sold, and should indicate when a product is sold out.',
      'The machine moves through clear states during a transaction (idle, selecting, awaiting payment, dispensing, etc.) — state modeling matters here.',
    ],
    constraints: [
      'Selecting a sold-out product must be handled without crashing or accepting payment for it.',
      'A transaction can be cancelled mid-way, and any inserted payment should be returned.',
      'Payment method is intentionally a variation point (coins today, card/mobile later).',
    ],
    expectedEntities: [
      {
        label: 'Product / Item',
        synonyms: ['product', 'item', 'slot', 'sku'],
        rationale: 'Price and quantity per product are core data the whole flow depends on.',
        required: true,
      },
      {
        label: 'Inventory',
        synonyms: ['inventory', 'stock'],
        rationale: 'Tracking and updating available quantity per product is explicitly required and is distinct behaviour from the product data itself.',
        required: false,
      },
      {
        label: 'Vending Machine state / state machine',
        synonyms: ['state', 'vendingmachinestate', 'idle', 'transaction'],
        rationale: 'The requirements explicitly call out clear states during a transaction — this is a strong hint toward the State pattern.',
        required: true,
      },
      {
        label: 'Payment',
        synonyms: ['payment', 'coin', 'cash', 'money'],
        rationale: 'Validating payment against price and computing change requires a distinct payment concept.',
        required: true,
      },
    ],
    variationPoints: [
      {
        label: 'Payment method strategy',
        extensibilitySignals: ['paymentmethod', 'paymentstrategy', 'cardpayment', 'coinpayment', 'strategy'],
        rationale:
          'The requirements explicitly flag payment method as something that will change later (coins now, card/mobile later) — a textbook Strategy interface candidate.',
      },
      {
        label: 'Transaction state handling',
        extensibilitySignals: ['state', 'statemachine', 'idlestate', 'dispensingstate'],
        rationale:
          'Modeling states as an enum plus giant if/else is a common but limiting approach; representing states as distinct types/handlers is a genuine extensibility question this problem raises.',
      },
    ],
  },
];
