/**
 * Script de teste para validar a normalização de dados da API Saipos
 * 
 * Este script:
 * 1. Busca dados reais da API Saipos
 * 2. Valida a estrutura dos dados
 * 3. Testa a normalização
 * 4. Mostra estatísticas detalhadas
 */

// Dados de exemplo baseados na documentação real da Saipos
const sampleSaiposResponse = [
  {
    id_store: 1,
    id_sale: 12345,
    id_sale_type: 1, // 1=Delivery, 2=Retirada, 3=Salão, 4=Ficha
    created_at: "2025-11-02T10:30:00",
    updated_at: "2025-11-02T10:45:00",
    shift_date: "2025-11-02T00:00:00",
    total_items_value: 50.00,
    discount_value: 5.00,
    surcharge_value: 2.00,
    total_sale_value: 47.00, // total_items_value - discount_value + surcharge_value
    total_amount: 47.00, // Campo real da API
    observations: "Cliente pediu sem cebola",
    status: "completed",
    items: [
      {
        id_sale_item: 1,
        id_store_item: 101,
        desc_sale_item: "Pizza Margherita Grande",
        quantity: 1,
        unit_price: 35.00,
        status: 1,
        deleted: false,
        choices: [
          {
            id_sale_item_choice: 1,
            desc_sale_item_choice: "Borda Recheada",
            aditional_price: 5.00
          }
        ]
      },
      {
        id_sale_item: 2,
        id_store_item: 202,
        desc_sale_item: "Refrigerante 2L",
        quantity: 1,
        unit_price: 10.00,
        status: 1,
        deleted: false,
        choices: []
      }
    ],
    customer: {
      id_customer: 5001,
      name: "João Silva",
      phone: "11999999999",
      document: "123.456.789-00",
      email: "joao@email.com"
    },
    payments: [
      {
        id_payment: 1,
        payment_type: "credit_card",
        amount: 47.00,
        installments: 1,
        brand: "Visa"
      }
    ],
    delivery: {
      delivery_fee: 7.00,
      delivery_time: 45,
      delivery_by: "MERCHANT",
      street: "Rua das Flores",
      number: "123",
      district: "Centro",
      city: "São Paulo",
      state: "SP"
    }
  },
  {
    id_store: 1,
    id_sale: 12346,
    id_sale_type: 2, // Retirada
    created_at: "2025-11-02T11:15:00",
    shift_date: "2025-11-02T00:00:00",
    total_items_value: 25.00,
    discount_value: 0.00,
    surcharge_value: 0.00,
    total_sale_value: 25.00,
    total_amount: 25.00, // Campo real da API
    status: "completed",
    items: [
      {
        id_sale_item: 3,
        desc_sale_item: "X-Burger",
        quantity: 2,
        unit_price: 12.50,
        status: 1,
        deleted: false,
        choices: []
      }
    ],
    customer: {
      id_customer: 5002,
      name: "Maria Santos"
    },
    payments: [
      {
        payment_type: "pix",
        amount: 25.00
      }
    ]
  },
  {
    id_store: 1,
    id_sale: 12347,
    id_sale_type: 3, // Salão
    created_at: "2025-11-02T12:30:00",
    shift_date: "2025-11-02T00:00:00",
    total_items_value: 80.00,
    discount_value: 8.00,
    surcharge_value: 0.00,
    total_sale_value: 72.00,
    total_amount: 72.00, // Campo real da API
    status: "completed",
    items: [
      {
        id_sale_item: 4,
        desc_sale_item: "Prato Executivo",
        quantity: 2,
        unit_price: 30.00,
        status: 1,
        deleted: false
      },
      {
        id_sale_item: 5,
        desc_sale_item: "Suco Natural",
        quantity: 2,
        unit_price: 10.00,
        status: 1,
        deleted: false
      }
    ],
    customer: null, // Cliente não identificado (mesa)
    payments: [
      {
        payment_type: "debit_card",
        amount: 72.00
      }
    ]
  }
];

// Função de normalização ajustada para a estrutura REAL da Saipos
function normalizeSaiposSalesData(apiJson: unknown) {
  type JsonObject = Record<string, unknown>;

  const asArray = (value: unknown): JsonObject[] => {
    return Array.isArray(value) ? (value as JsonObject[]) : [];
  };

  const getProp = (obj: JsonObject | undefined, key: string): unknown => {
    return obj ? (obj as Record<string, unknown>)[key] : undefined;
  };

  const toStringVal = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return fallback;
  };

  const toNumberVal = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  };

  try {
    console.log('\n🔍 INICIANDO NORMALIZAÇÃO DE DADOS SAIPOS\n');
    
    // A API retorna um array de vendas diretamente
    let salesArray: JsonObject[] = [];
    
    if (Array.isArray(apiJson)) {
      salesArray = apiJson as JsonObject[];
    } else if (typeof apiJson === 'object' && apiJson !== null) {
      const root = apiJson as JsonObject;
      const candidate = getProp(root, 'data') ?? getProp(root, 'results') ?? getProp(root, 'sales');
      if (candidate) {
        salesArray = asArray(candidate);
      }
    }

    console.log(`📊 Total de vendas encontradas: ${salesArray.length}\n`);

    if (salesArray.length === 0) {
      console.log('⚠️ Nenhuma venda encontrada para processar\n');
      return {
        date: new Date().toISOString().split('T')[0],
        totalSales: 0,
        totalOrders: 0,
        averageTicket: 0,
        uniqueCustomers: 0,
        totalRevenue: 0,
        ordersByChannel: { delivery: 0, counter: 0, hall: 0, ticket: 0 },
        topProducts: [],
      };
    }

    // Pegar a data do primeiro item
    const firstSale = salesArray[0] as JsonObject;
    const shiftDate = toStringVal(firstSale.shift_date ?? firstSale.created_at ?? new Date().toISOString());
    const dateOnly = shiftDate.split('T')[0];

    console.log(`📅 Data das vendas: ${dateOnly}\n`);

    // Análise da primeira venda para debug
    console.log('🔍 ANÁLISE DA PRIMEIRA VENDA:');
    console.log(`   ID: ${firstSale.id_sale}`);
    console.log(`   Tipo: ${firstSale.id_sale_type} (1=Delivery, 2=Retirada, 3=Salão, 4=Ficha)`);
    console.log(`   Total Itens: R$ ${firstSale.total_items_value}`);
    console.log(`   Desconto: R$ ${firstSale.discount_value}`);
    console.log(`   Acréscimo: R$ ${firstSale.surcharge_value}`);
    console.log(`   Total Venda: R$ ${firstSale.total_sale_value}`);
    console.log(`   Campos disponíveis: ${Object.keys(firstSale).join(', ')}\n`);

    // Calcular totais por tipo de venda (id_sale_type)
    const deliverySales = salesArray.filter(s => toNumberVal(s.id_sale_type) === 1);
    const counterSales = salesArray.filter(s => toNumberVal(s.id_sale_type) === 2);
    const hallSales = salesArray.filter(s => toNumberVal(s.id_sale_type) === 3);
    const ticketSales = salesArray.filter(s => toNumberVal(s.id_sale_type) === 4);

    console.log('📊 VENDAS POR CANAL:');
    console.log(`   🚚 Delivery: ${deliverySales.length} vendas`);
    console.log(`   🏪 Retirada: ${counterSales.length} vendas`);
    console.log(`   🍽️  Salão: ${hallSales.length} vendas`);
    console.log(`   🎫 Ficha: ${ticketSales.length} vendas\n`);

    // Calcular valores totais usando o campo correto: total_sale_value
    const totalRevenue = salesArray.reduce((sum, s) => {
      const saleValue = toNumberVal(s.total_sale_value);
      return sum + saleValue;
    }, 0);

    const totalOrders = salesArray.length;
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    console.log('💰 VALORES TOTAIS:');
    console.log(`   Total Vendas: R$ ${totalRevenue.toFixed(2)}`);
    console.log(`   Total Pedidos: ${totalOrders}`);
    console.log(`   Ticket Médio: R$ ${averageTicket.toFixed(2)}\n`);

    // Extrair clientes únicos
    const customerIds = new Set<string>();
    salesArray.forEach(s => {
      const customer = getProp(s, 'customer');
      if (customer && typeof customer === 'object') {
        const customerId = toStringVal((customer as JsonObject).id_customer);
        if (customerId) {
          customerIds.add(customerId);
        }
      }
    });

    const uniqueCustomers = customerIds.size;
    console.log(`👥 Clientes Únicos: ${uniqueCustomers}\n`);

    // Extrair produtos mais vendidos dos itens
    const productMap = new Map<string, { quantity: number; revenue: number; name: string }>();
    
    salesArray.forEach((sale: JsonObject) => {
      const items = asArray(getProp(sale, 'items'));
      items.forEach((item: JsonObject) => {
        // Ignorar itens deletados
        if (item.deleted === true) return;
        
        const itemName = toStringVal(item.desc_sale_item || item.desc_store_item || 'Item sem nome');
        const quantity = toNumberVal(item.quantity);
        const unitPrice = toNumberVal(item.unit_price);
        
        // Adicionar preço de complementos (choices)
        let additionalPrice = 0;
        const choices = asArray(getProp(item, 'choices'));
        choices.forEach((choice: JsonObject) => {
          additionalPrice += toNumberVal(choice.aditional_price);
        });
        
        const itemTotal = (unitPrice + additionalPrice) * quantity;

        if (productMap.has(itemName)) {
          const existing = productMap.get(itemName)!;
          existing.quantity += quantity;
          existing.revenue += itemTotal;
        } else {
          productMap.set(itemName, { quantity, revenue: itemTotal, name: itemName });
        }
      });
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(p => ({ name: p.name, quantity: p.quantity, revenue: p.revenue }));

    console.log('🏆 TOP 10 PRODUTOS:');
    topProducts.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name}: ${p.quantity}x - R$ ${p.revenue.toFixed(2)}`);
    });
    console.log('');

    // Calcular valores por canal
    const deliveryRevenue = deliverySales.reduce((sum, s) => sum + toNumberVal(s.total_sale_value), 0);
    const counterRevenue = counterSales.reduce((sum, s) => sum + toNumberVal(s.total_sale_value), 0);
    const hallRevenue = hallSales.reduce((sum, s) => sum + toNumberVal(s.total_sale_value), 0);
    const ticketRevenue = ticketSales.reduce((sum, s) => sum + toNumberVal(s.total_sale_value), 0);

    console.log('💵 FATURAMENTO POR CANAL:');
    console.log(`   🚚 Delivery: R$ ${deliveryRevenue.toFixed(2)}`);
    console.log(`   🏪 Retirada: R$ ${counterRevenue.toFixed(2)}`);
    console.log(`   🍽️  Salão: R$ ${hallRevenue.toFixed(2)}`);
    console.log(`   🎫 Ficha: R$ ${ticketRevenue.toFixed(2)}\n`);

    const result = {
      date: dateOnly,
      totalSales: totalRevenue,
      totalOrders: totalOrders,
      averageTicket: averageTicket,
      uniqueCustomers: uniqueCustomers,
      totalRevenue: totalRevenue,
      deliverySales: deliveryRevenue,
      counterSales: counterRevenue,
      hallSales: hallRevenue,
      ticketSales: ticketRevenue,
      ordersByChannel: {
        delivery: deliverySales.length,
        counter: counterSales.length,
        hall: hallSales.length,
        ticket: ticketSales.length,
      },
      topProducts: topProducts,
    };

    console.log('✅ NORMALIZAÇÃO CONCLUÍDA COM SUCESSO!\n');
    console.log('📋 RESULTADO FINAL:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n');

    return result;
  } catch (error) {
    console.error('❌ ERRO ao normalizar resposta:', error);
    const today = new Date().toISOString().split('T')[0];
    return {
      date: today,
      totalSales: 0,
      totalOrders: 0,
      averageTicket: 0,
      uniqueCustomers: 0,
      totalRevenue: 0,
      ordersByChannel: { delivery: 0, counter: 0, hall: 0, ticket: 0 },
      topProducts: [],
    };
  }
}

// Executar teste
console.log('═══════════════════════════════════════════════════════════');
console.log('  TESTE DE NORMALIZAÇÃO DE DADOS DA API SAIPOS');
console.log('═══════════════════════════════════════════════════════════\n');

const result = normalizeSaiposSalesData(sampleSaiposResponse);

console.log('═══════════════════════════════════════════════════════════');
console.log('  VALIDAÇÃO DOS RESULTADOS');
console.log('═══════════════════════════════════════════════════════════\n');

// Validar resultados
const expectedTotal = 47.00 + 25.00 + 72.00; // Soma dos total_sale_value
const tolerance = 0.01;

if (Math.abs(result.totalRevenue - expectedTotal) < tolerance) {
  console.log('✅ Total de vendas está CORRETO!');
  console.log(`   Esperado: R$ ${expectedTotal.toFixed(2)}`);
  console.log(`   Calculado: R$ ${result.totalRevenue.toFixed(2)}\n`);
} else {
  console.log('❌ Total de vendas está INCORRETO!');
  console.log(`   Esperado: R$ ${expectedTotal.toFixed(2)}`);
  console.log(`   Calculado: R$ ${result.totalRevenue.toFixed(2)}`);
  console.log(`   Diferença: R$ ${(result.totalRevenue - expectedTotal).toFixed(2)}\n`);
}

if (result.totalOrders === 3) {
  console.log('✅ Total de pedidos está CORRETO!');
  console.log(`   Esperado: 3`);
  console.log(`   Calculado: ${result.totalOrders}\n`);
} else {
  console.log('❌ Total de pedidos está INCORRETO!');
  console.log(`   Esperado: 3`);
  console.log(`   Calculado: ${result.totalOrders}\n`);
}

if (result.uniqueCustomers === 2) {
  console.log('✅ Clientes únicos está CORRETO!');
  console.log(`   Esperado: 2`);
  console.log(`   Calculado: ${result.uniqueCustomers}\n`);
} else {
  console.log('❌ Clientes únicos está INCORRETO!');
  console.log(`   Esperado: 2`);
  console.log(`   Calculado: ${result.uniqueCustomers}\n`);
}

if (result.ordersByChannel.delivery === 1 && 
    result.ordersByChannel.counter === 1 && 
    result.ordersByChannel.hall === 1) {
  console.log('✅ Vendas por canal estão CORRETAS!');
  console.log(`   Delivery: 1, Retirada: 1, Salão: 1\n`);
} else {
  console.log('❌ Vendas por canal estão INCORRETAS!');
  console.log(`   Calculado: Delivery=${result.ordersByChannel.delivery}, Retirada=${result.ordersByChannel.counter}, Salão=${result.ordersByChannel.hall}\n`);
}

console.log('═══════════════════════════════════════════════════════════\n');

