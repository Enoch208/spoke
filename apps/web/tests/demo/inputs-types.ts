import type { ClientContract, ClientInput, ClientMethod } from "@spoke/protocol";
import type { Persona } from "../../src/demo/world/types";

export type MethodInputs = { [M in ClientMethod]?: ClientInput<M> };

export type MethodPersonas = { [M in ClientMethod]?: Persona };

export type MethodSetups = { [M in ClientMethod]?: (client: ClientContract) => Promise<unknown> };
