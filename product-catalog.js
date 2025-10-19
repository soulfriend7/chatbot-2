// Справочник продуктов Zaman Bank
const PRODUCTS_CATALOG = {
  RETAIL: [
    {
      id: 'bnpl_retail',
      name: 'BNPL (рассрочка)',
      category: 'Retail',
      type: 'Финансирование',
      minAmount: 10000,
      maxAmount: 300000,
      term: '1-12 месяцев',
      ageRange: '18-63 лет',
      fee: 'от 300 тг',
      description: 'Позволяет оформить рассрочку на покупки без переплат на короткий срок.',
      islamic: false,
      target: 'retail'
    },
    {
      id: 'islamic_financing_retail',
      name: 'Исламское финансирование',
      category: 'Retail',
      type: 'Финансирование',
      minAmount: 100000,
      maxAmount: 5000000,
      term: '3-60 месяцев',
      ageRange: '18-60 лет',
      fee: 'от 6 000 тг',
      description: 'Беззалоговый исламский кредит для личных нужд.',
      islamic: true,
      target: 'retail'
    },
    {
      id: 'islamic_mortgage',
      name: 'Исламская ипотека',
      category: 'Retail',
      type: 'Финансирование',
      minAmount: 3000000,
      maxAmount: 75000000,
      term: '12-240 месяцев',
      ageRange: '25-60 лет',
      fee: 'от 200 000 тг',
      description: 'Долгосрочный ипотечный кредит в соответствии с принципами исламского финансирования.',
      islamic: true,
      target: 'retail'
    },
    {
      id: 'kopilka',
      name: 'Копилка',
      category: 'Retail',
      type: 'Инвестиционный',
      minAmount: 1000,
      maxAmount: 20000000,
      term: '1-12 месяцев',
      expectedReturn: 'до 18%',
      description: 'Инвестиционный продукт с возможностью получения дохода до 18% в год.',
      islamic: false,
      target: 'retail'
    },
    {
      id: 'wakala',
      name: 'Вакала',
      category: 'Retail',
      type: 'Инвестиционный',
      minAmount: 50000,
      maxAmount: null, // не ограничена
      term: '3-36 месяцев',
      expectedReturn: 'до 20%',
      description: 'Инвестиционный продукт с доходностью до 20%, рассчитанный на среднесрочные вложения.',
      islamic: true,
      target: 'retail'
    }
  ],
  
  SME: [
    {
      id: 'business_card_overdraft',
      name: 'Бизнес карта (овердрафт)',
      category: 'SME',
      type: 'Исламский кредитный лимит на счет',
      minAmount: 100000,
      maxAmount: 10000000,
      term: 'до 30 дней',
      ageRange: '21-63 лет',
      fee: 'от 3 000 тг',
      description: 'Позволяет использовать овердрафт на счет для краткосрочных бизнес-операций.',
      islamic: true,
      target: 'sme'
    },
    {
      id: 'islamic_financing_sme_unsecured',
      name: 'Исламское финансирование (беззалоговое)',
      category: 'SME',
      type: 'Финансирование',
      minAmount: 100000,
      maxAmount: 10000000,
      term: '3-60 месяцев',
      ageRange: '21-63 лет',
      fee: 'от 12 000 тг',
      description: 'Исламский кредит без залога для развития бизнеса.',
      islamic: true,
      target: 'sme'
    },
    {
      id: 'islamic_financing_sme_secured',
      name: 'Исламское финансирование (залоговое)',
      category: 'SME',
      type: 'Финансирование',
      minAmount: 100000,
      maxAmount: 10000000,
      term: '3-60 месяцев',
      ageRange: '21-63 лет',
      fee: 'от 12 000 тг',
      description: 'Исламский кредит под залог для бизнеса.',
      islamic: true,
      target: 'sme'
    },
    {
      id: 'overnight_deposit',
      name: 'Овернайт (депозит)',
      category: 'SME',
      type: 'Депозитный',
      minAmount: 1000000,
      maxAmount: 100000000,
      term: '1-12 месяцев',
      expectedReturn: '12%',
      description: 'Краткосрочный депозит с доходностью 12% для бизнеса.',
      islamic: false,
      target: 'sme'
    },
    {
      id: 'profitable_deposit',
      name: 'Выгодный (депозит)',
      category: 'SME',
      type: 'Депозитный',
      minAmount: 500000,
      maxAmount: 100000000,
      term: '3-12 месяцев',
      expectedReturn: '17%',
      description: 'Среднесрочный депозит с доходностью до 17%.',
      islamic: false,
      target: 'sme'
    },
    {
      id: 'business_card_payment',
      name: 'Бизнес-карта (платежная)',
      category: 'SME',
      type: 'Платежный продукт',
      dailyLimit: 'до 10 000 000 тг в сутки',
      cashWithdrawal: 'до 1 000 000 тг бесплатно, выше 1%',
      cashback: 'до 1% на категории бизнес-расходов',
      fee: '0 тг',
      description: 'Платежная карта для бизнеса с кэшбэком и бесплатным обслуживанием.',
      islamic: false,
      target: 'sme'
    },
    {
      id: 'tariff_packages',
      name: 'Тарифные пакеты (РКО)',
      category: 'SME',
      type: 'Расчётно-кассовое обслуживание',
      paymentsPerMonth: '10-200 в месяц',
      monthlyFee: 'от 0 до 15 000 тг/мес',
      accountOpening: 'бесплатно',
      additionalServices: 'проверка контрагентов, налоговая отчетность, сервисы по развитию бизнеса',
      description: 'Пакеты РКО с бонусами и расширенными бизнес-сервисами.',
      islamic: false,
      target: 'sme'
    }
  ]
};

class ProductCatalog {
  constructor() {
    this.products = [...PRODUCTS_CATALOG.RETAIL, ...PRODUCTS_CATALOG.SME];
    this.categories = ['Retail', 'SME'];
    this.types = [...new Set(this.products.map(p => p.type))];
  }

  // Получить все продукты
  getAllProducts() {
    return this.products;
  }

  // Поиск продуктов
  searchProducts(query, filters = {}) {
    let results = [...this.products];
    
    // Текстовый поиск
    if (query) {
      const searchQuery = query.toLowerCase();
      results = results.filter(product => 
        product.name.toLowerCase().includes(searchQuery) ||
        product.description.toLowerCase().includes(searchQuery) ||
        product.type.toLowerCase().includes(searchQuery) ||
        product.category.toLowerCase().includes(searchQuery)
      );
    }
    
    // Фильтры
    if (filters.category) {
      results = results.filter(product => 
        product.category.toLowerCase().includes(filters.category.toLowerCase())
      );
    }
    
    if (filters.type) {
      results = results.filter(product => 
        product.type.toLowerCase().includes(filters.type.toLowerCase())
      );
    }
    
    if (filters.islamic !== undefined) {
      results = results.filter(product => product.islamic === filters.islamic);
    }
    
    if (filters.target) {
      results = results.filter(product => product.target === filters.target);
    }
    
    if (filters.minAmount) {
      results = results.filter(product => product.minAmount <= filters.minAmount);
    }
    
    if (filters.maxAmount) {
      results = results.filter(product => 
        product.maxAmount === null || product.maxAmount >= filters.maxAmount
      );
    }
    
    return results;
  }

  // Получить продукт по ID
  getProductById(id) {
    return this.products.find(product => product.id === id);
  }

  // Получить продукты по категории
  getProductsByCategory(category) {
    return this.products.filter(product => 
      product.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  // Получить исламские продукты
  getIslamicProducts() {
    return this.products.filter(product => product.islamic);
  }

  // Получить продукты для Retail
  getRetailProducts() {
    return this.products.filter(product => product.target === 'retail');
  }

  // Получить продукты для SME
  getSMEProducts() {
    return this.products.filter(product => product.target === 'sme');
  }

  // Получить все категории
  getCategories() {
    return this.categories;
  }

  // Получить все типы
  getTypes() {
    return this.types;
  }

  // Получить статистику
  getStats() {
    return {
      totalProducts: this.products.length,
      categories: this.categories.length,
      types: this.types.length,
      islamicProducts: this.products.filter(p => p.islamic).length,
      regularProducts: this.products.filter(p => !p.islamic).length,
      retailProducts: this.products.filter(p => p.target === 'retail').length,
      smeProducts: this.products.filter(p => p.target === 'sme').length
    };
  }

  // Получить рекомендации на основе профиля пользователя
  getRecommendations(userProfile) {
    const recommendations = [];
    
    // Фильтруем по доходу
    const affordableProducts = this.products.filter(product => 
      product.minAmount <= userProfile.income * 0.3 // Не более 30% от дохода
    );
    
    // Рекомендации для Retail клиентов
    if (userProfile.type === 'retail' || !userProfile.type) {
      const retailProducts = affordableProducts.filter(p => p.target === 'retail');
      recommendations.push(...retailProducts.slice(0, 3));
    }
    
    // Рекомендации для SME клиентов
    if (userProfile.type === 'sme') {
      const smeProducts = affordableProducts.filter(p => p.target === 'sme');
      recommendations.push(...smeProducts.slice(0, 3));
    }
    
    // Исламские продукты для мусульман
    if (userProfile.preferences && userProfile.preferences.islamic) {
      const islamicProducts = affordableProducts.filter(p => p.islamic);
      recommendations.push(...islamicProducts.slice(0, 2));
    }
    
    // Депозиты для консервативных
    if (userProfile.riskTolerance === 'conservative') {
      const deposits = affordableProducts.filter(p => 
        p.type.toLowerCase().includes('депозит') || 
        p.type.toLowerCase().includes('инвестиционный')
      );
      recommendations.push(...deposits.slice(0, 2));
    }
    
    // Финансирование для агрессивных
    if (userProfile.riskTolerance === 'aggressive') {
      const financing = affordableProducts.filter(p => 
        p.type.toLowerCase().includes('финансирование')
      );
      recommendations.push(...financing.slice(0, 2));
    }
    
    // Убираем дубликаты и возвращаем топ-5
    const uniqueRecommendations = recommendations.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    );
    
    return uniqueRecommendations.slice(0, 5);
  }

  // Форматирование продукта для AI
  formatProductForAI(product) {
    return {
      название: product.name,
      категория: product.category,
      тип: product.type,
      минимальная_сумма: product.minAmount,
      максимальная_сумма: product.maxAmount || 'не ограничена',
      срок: product.term,
      возраст: product.ageRange || 'не указан',
      комиссия: product.fee || 'не указана',
      доходность: product.expectedReturn || 'не указана',
      исламский: product.islamic ? 'Да' : 'Нет',
      описание: product.description,
      целевая_аудитория: product.target
    };
  }

  // Получить продукты по типу
  getProductsByType(type) {
    return this.products.filter(product => 
      product.type.toLowerCase().includes(type.toLowerCase())
    );
  }

  // Поиск по возрасту
  getProductsByAge(age) {
    return this.products.filter(product => {
      if (!product.ageRange) return true;
      
      const [minAge, maxAge] = product.ageRange.split('-').map(a => parseInt(a.trim()));
      return age >= minAge && age <= maxAge;
    });
  }

  // Поиск по сумме
  getProductsByAmount(amount) {
    return this.products.filter(product => 
      amount >= product.minAmount && 
      (product.maxAmount === null || amount <= product.maxAmount)
    );
  }
}

module.exports = ProductCatalog;
