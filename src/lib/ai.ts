import type { CollectionKey, Entity } from "./types";
import { nowISO, uid } from "./storage";

export type AIResult =
  | {
      type: "reply";
      text: string;
    }
  | {
      type: "create";
      collection: CollectionKey;
      entity: Entity;
      text: string;
      confirm?: boolean;
    }
  | {
      type: "sync";
      text: string;
    };

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function interpretAI(input: string, ctx: { counts: Record<string, number>; online: boolean }) {
  const text = normalize(input);

  if (text.includes("sincron")) {
    return { type: "sync", text: "Sincronização solicitada." } as AIResult;
  }

  if (text.includes("quais instalacoes") || text.includes("quais instalacoes tenho amanha") || text.includes("instalacoes tenho amanha")) {
    return { type: "reply", text: `Você tem ${ctx.counts.installations || 0} instalação(ões) cadastrada(s) no sistema.` } as AIResult;
  }

  if (text.includes("estoque")) {
    return { type: "reply", text: `Há ${ctx.counts.stock || 0} item(ns) no estoque. Posso listar o crítico e criar compra.` } as AIResult;
  }

  if (text.includes("financeiro") || text.includes("fluxo de caixa")) {
    return { type: "reply", text: `Financeiro carregado. Registros atuais: ${ctx.counts.finance || 0}.` } as AIResult;
  }

  if (text.includes("criar cliente")) {
    return {
      type: "create",
      collection: "clients",
      entity: {
        id: uid(),
        name: "Novo cliente",
        type: "PF",
        phone: "",
        email: "",
        city: "",
        status: "Novo",
        notes: "",
        createdAt: nowISO()
      },
      text: "Cliente criado."
    };
  }

  if (text.includes("criar lead")) {
    return {
      type: "create",
      collection: "leads",
      entity: {
        id: uid(),
        origin: "IA",
        client: "Novo lead",
        product: "Toldo personalizado",
        location: "",
        estimatedValue: 0,
        status: "Novo lead",
        followUp: "",
        notes: "",
        createdAt: nowISO()
      },
      text: "Lead criado."
    };
  }

  if (text.includes("registrar medicao") || text.includes("registrar medição")) {
    return {
      type: "create",
      collection: "measurements",
      entity: {
        id: uid(),
        client: "",
        address: "",
        type: "Toldo retrátil",
        width: 0,
        projection: 0,
        height: 0,
        notes: "",
        photos: "",
        createdAt: nowISO()
      },
      text: "Medição registrada."
    };
  }

  if (text.includes("criar orcamento") || text.includes("criar orçamento")) {
    return {
      type: "create",
      collection: "quotes",
      entity: {
        id: uid(),
        client: "",
        model: "",
        material: "",
        color: "",
        quantity: 1,
        cost: 0,
        margin: 40,
        suggestedPrice: 0,
        finalPrice: 0,
        status: "Rascunho",
        validUntil: "",
        paymentMethod: "A combinar",
        notes: "",
        createdAt: nowISO()
      },
      text: "Orçamento criado."
    };
  }

  if (text.includes("criar ordem de producao") || text.includes("criar ordem")) {
    return {
      type: "create",
      collection: "production",
      entity: {
        id: uid(),
        client: "",
        product: "",
        materials: "",
        quantity: 1,
        responsible: "",
        due: "",
        priority: "Média",
        status: "Aguardando produção",
        notes: "",
        createdAt: nowISO()
      },
      text: "Ordem de produção criada."
    };
  }

  if (text.includes("criar instalacao")) {
    return {
      type: "create",
      collection: "installations",
      entity: {
        id: uid(),
        client: "",
        address: "",
        date: "",
        time: "",
        team: "",
        status: "Agendada",
        signature: "",
        notes: "",
        createdAt: nowISO()
      },
      text: "Instalação criada."
    };
  }

  if (text.includes("criar manutencao") || text.includes("criar manutenção")) {
    return {
      type: "create",
      collection: "maintenance",
      entity: {
        id: uid(),
        client: "",
        problem: "",
        diagnostic: "",
        parts: "",
        tech: "",
        warranty: "",
        status: "Aberto",
        notes: "",
        createdAt: nowISO()
      },
      text: "Manutenção criada."
    };
  }

  if (text.includes("criar tarefa")) {
    return {
      type: "create",
      collection: "calendar",
      entity: {
        id: uid(),
        date: "",
        title: "Nova tarefa",
        type: "Tarefa",
        responsible: "",
        status: "Pendente",
        notes: "",
        createdAt: nowISO()
      },
      text: "Tarefa criada."
    };
  }

  return {
    type: "reply",
    text: "Comando recebido. Posso criar cliente, lead, orçamento, medição, instalação, manutenção, ordem de produção, tarefa, ou consultar estoque/financeiro."
  } as AIResult;
}
