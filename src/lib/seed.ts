import type { AppState } from "./types";

export function createSeedState(): AppState {
  return {
    profile: {
      company: "Toldo Pro Demo",
      user: "Administrador",
      role: "Administrador",
      online: true
    },
    collections: {
      companies: [
        {
          id: "c1",
          cnpj: "00.000.000/0001-00",
          razaoSocial: "Toldo Pro LTDA",
          nomeFantasia: "Toldo Pro",
          phone: "(11) 3333-0000",
          whatsapp: "(11) 99999-0000",
          email: "contato@toldopro.com",
          city: "São Paulo",
          status: "Ativa",
          workingHours: "08:00-18:00",
          notes: "Empresa principal"
        }
      ],
      users: [
        {
          id: "u1",
          name: "Administrador",
          email: "admin@toldopro.com",
          role: "Administrador",
          company: "Toldo Pro",
          status: "Ativo"
        }
      ],
      roles: [
        {
          id: "r1",
          name: "Administrador",
          permissions: "Tudo liberado"
        }
      ],
      employees: [
        {
          id: "e1",
          name: "Carlos Lima",
          cpf: "000.000.000-00",
          phone: "(11) 98888-1111",
          role: "Instalador",
          salary: 3200,
          team: "Instalação",
          status: "Ativo"
        }
      ],
      timecards: [
        {
          id: "t1",
          employee: "Carlos Lima",
          date: "2026-09-26",
          checkIn: "08:00",
          checkOut: "17:00",
          break: "01:00",
          workedHours: "08:00",
          notes: "Sem ocorrências"
        }
      ],
      clients: [
        {
          id: "cl1",
          type: "PF",
          name: "João Silva",
          cpfCnpj: "000.000.000-00",
          phone: "(11) 99999-1111",
          email: "joao@email.com",
          city: "São Paulo",
          status: "Contato",
          notes: "Cliente residencial"
        },
        {
          id: "cl2",
          type: "PJ",
          name: "Loja Central LTDA",
          cpfCnpj: "00.000.000/0001-00",
          phone: "(11) 98888-2222",
          email: "compras@lojacentral.com",
          city: "Campinas",
          status: "Orçamento",
          notes: "Cliente comercial"
        }
      ],
      leads: [
        {
          id: "l1",
          origin: "WhatsApp",
          client: "João Silva",
          product: "Toldo retrátil",
          location: "Residência",
          estimatedValue: 3200,
          status: "Novo lead",
          followUp: "2026-09-27",
          notes: "Interessado em orçamento"
        }
      ],
      funnel: [
        {
          id: "f1",
          stage: "Contato",
          lead: "João Silva",
          responsible: "Vendedor",
          value: 3200,
          probability: 35,
          lostReason: "",
          notes: ""
        }
      ],
      catalog: [
        {
          id: "cat1",
          type: "Toldo retrátil",
          name: "Modelo Premium",
          materials: "Alumínio + lona",
          colors: "Branco, Bege, Cinza",
          price: 3500,
          cost: 2100,
          margin: 40,
          active: true
        }
      ],
      materials: [
        {
          id: "m1",
          item: "Lona PVC 500g",
          unit: "m²",
          cost: 45,
          supplier: "Tecidos BR",
          min: 10,
          max: 100,
          code: "LPVC500",
          notes: ""
        },
        {
          id: "m2",
          item: "Perfil alumínio",
          unit: "barra",
          cost: 62,
          supplier: "Metal Sul",
          min: 20,
          max: 120,
          code: "ALU01",
          notes: ""
        }
      ],
      measurements: [
        {
          id: "me1",
          client: "João Silva",
          address: "Rua das Flores, 10",
          type: "Toldo retrátil",
          width: 3.2,
          projection: 2.0,
          height: 2.5,
          notes: "Parede em boas condições",
          photos: "captura-01.jpg"
        }
      ],
      inspections: [
        {
          id: "i1",
          client: "João Silva",
          address: "Rua das Flores, 10",
          risks: "Nenhum",
          access: "Fácil",
          equipment: "Escada",
          approved: true,
          notes: "Aprovado para instalação"
        }
      ],
      quotes: [
        {
          id: "q1",
          client: "João Silva",
          model: "Toldo retrátil",
          material: "Lona PVC",
          color: "Bege",
          quantity: 1,
          cost: 2100,
          margin: 40,
          suggestedPrice: 3500,
          finalPrice: 3400,
          status: "Enviado",
          validUntil: "2026-10-10",
          paymentMethod: "Pix",
          notes: ""
        }
      ],
      pricingRules: [
        {
          id: "pr1",
          name: "Padrão",
          basis: "Material + mão de obra + instalação",
          laborCost: 500,
          displacement: 120,
          expenses: 180,
          margin: 40,
          minimumPrice: 0
        }
      ],
      projects: [
        {
          id: "pj1",
          client: "João Silva",
          model: "Toldo retrátil",
          width: 3.2,
          projection: 2,
          material: "Lona PVC",
          structure: "Alumínio",
          notes: "Projeto aprovado"
        }
      ],
      production: [
        {
          id: "p1",
          client: "João Silva",
          product: "Toldo retrátil",
          materials: "Lona PVC + perfil alumínio",
          quantity: 1,
          responsible: "Oficina",
          due: "2026-09-30",
          priority: "Alta",
          status: "Em produção",
          notes: ""
        }
      ],
      bom: [
        {
          id: "b1",
          model: "Toldo retrátil",
          component: "Lona PVC",
          qty: 3.5,
          unit: "m²",
          waste: 0.1,
          laborTime: "02:00"
        }
      ],
      stock: [
        {
          id: "s1",
          item: "Lona PVC 500g",
          qty: 8,
          min: 10,
          max: 50,
          cost: 45,
          location: "Estoque A",
          status: "Baixo"
        }
      ],
      purchases: [
        {
          id: "pc1",
          supplier: "Tecidos BR",
          items: "Lona PVC 500g",
          quantities: "20 m²",
          price: 900,
          due: "2026-09-29",
          status: "Pedido",
          receivedAt: ""
        }
      ],
      deliveries: [
        {
          id: "d1",
          client: "Loja Central LTDA",
          address: "Av. Central, 120",
          date: "2026-09-29",
          driver: "Marcos",
          team: "Entrega",
          status: "Agendada",
          proof: ""
        }
      ],
      installations: [
        {
          id: "ins1",
          client: "João Silva",
          address: "Rua das Flores, 10",
          date: "2026-09-27",
          time: "08:00",
          team: "Equipe 1",
          status: "Agendada",
          signature: "",
          notes: ""
        }
      ],
      maintenance: [
        {
          id: "man1",
          client: "João Silva",
          problem: "Ajuste de lona",
          diagnostic: "Desalinhamento leve",
          parts: "Reajuste",
          tech: "Carlos",
          warranty: "30 dias",
          status: "Aberto",
          notes: ""
        }
      ],
      calendar: [
        {
          id: "cal1",
          date: "2026-09-27",
          title: "Visita João Silva",
          type: "Visita",
          responsible: "Vendedor",
          status: "Agendado",
          notes: ""
        },
        {
          id: "cal2",
          date: "2026-09-28",
          title: "Instalação Loja Central",
          type: "Instalação",
          responsible: "Instalação",
          status: "Agendado",
          notes: ""
        }
      ],
      whatsapp: [
        {
          id: "w1",
          contact: "João Silva",
          template: "Confirmação de visita",
          message: "Sua visita está confirmada para amanhã às 08:00.",
          channel: "WhatsApp",
          status: "Enviado",
          history: "2026-09-26"
        }
      ],
      finance: [
        {
          id: "fin1",
          kind: "Receita",
          label: "Entrada orçamento #q1",
          category: "Venda",
          amount: 1200,
          due: "2026-09-29",
          paidAt: "",
          status: "Pendente"
        },
        {
          id: "fin2",
          kind: "Despesa",
          label: "Compra lona",
          category: "Compras",
          amount: 760,
          due: "2026-09-28",
          paidAt: "2026-09-26",
          status: "Pago"
        }
      ],
      notifications: [
        {
          id: "n1",
          title: "Novo lead recebido do WhatsApp",
          kind: "Lead",
          read: false
        },
        {
          id: "n2",
          title: "Estoque baixo em Lona PVC 500g",
          kind: "Estoque",
          read: false
        }
      ],
      reports: [
        {
          id: "r1",
          title: "Relatório comercial",
          period: "Mensal",
          type: "PDF/CSV",
          export: "Disponível"
        }
      ],
      syncQueue: []
    },
    aiLog: [
      {
        id: "a1",
        role: "assistant",
        text: "Olá. Posso ajudar com clientes, leads, orçamentos, produção, estoque e sincronização.",
        timestamp: "2026-09-26T00:00:00.000Z"
      }
    ],
    syncQueue: [],
    settings: {
      theme: "dark",
      pwa: true,
      camera: true,
      gps: true,
      autoSync: true
    }
  };
}
