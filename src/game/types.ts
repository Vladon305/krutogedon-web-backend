import { Move } from './entities/move.entity';

export interface Card {
  id: number;
  name: string;
  cost: number;
  effect?: string; // Эффект карты (опционально)
  properties: CardProperty[]; // Свойства карты (например, AddOnePower)
  attackProperties: CardAttackProperty[]; // Атакующие свойства
  defenseProperties: CardDefenseProperty[]; // Защитные свойства
  imageUrl: string; // URL изображения карты
  damage?: number | null; // Урон, который наносит карта (опционально)
  // power?: number; // Мощь, которую дает карта (опционально)
  isAttack: boolean; // Является ли карта атакующей
  isDefense: boolean; // Является ли карта защитной
  isSingleCard: boolean; // Поле для инициализации количества карт
  isPermanent: boolean; // Ранее isCardOfStanding
  // isCardOfStanding: boolean; // Является ли карта постоянкой
  victoryPoints: number; // Очки победы
  type: CardType; // Тип карты (например, Seed, Legend)
}

export interface SelectedPlayArea {
  id: number;
  imageUrl: string;
}

export interface DeadWizard {
  id: number;
  name: string; // Номер дохлого колдуна
  imageUrl: string;
  properties: string[];
}

export interface WizardPropertyToken {
  id: number;
  // name: string;
  property: WizardPropertyEffect[];
  // description: string; // Например, "Один раз в свой ход можешь потратить 4 жизни чтобы взять 1 карту"
  imageUrl: string;
}

export interface KrutagidonPrize {
  id: number;
  name: string;
  description: string; // "В конце каждого хода ты берёшь на руку 6 карт из своей колоды и сбрасываешь одну из них"
  imageUrl: string;
  owner: Player | null; // Текущий владелец приза
}

export interface WizardBoard {
  id: number;
  name: string; // Имя колдуна
  imageUrl: string;
}

export interface PlayArea {
  id: number;
  imageUrl: string;
}

export interface Player {
  id: number; // Уникальный ID игрока (1, 2, ..., 5)
  userId: string; // ID пользователя из базы данных
  username: string; // Имя пользователя
  deck: Card[]; // Колода игрока
  hand: Card[]; // Карты в руке
  playArea: Card[]; // Карты в игровой зоне
  discard: Card[]; // Сброс
  health: number; // Текущее здоровье
  maxHealth: number; // Максимальное здоровье
  power: number; // Текущая мощь
  krutagidonCups: number; // Кубки крутагидона
  deadWizardCount: number; // Количество мертвых волшебников
  deadWizards: DeadWizard[]; // Список мертвых волшебников
  selectionCompleted: boolean; // Завершил ли игрок выбор карт
  selectedFamiliar: Card | null; // Выбранный фамильяр
  selectedProperty: WizardPropertyToken | null;
  selectedPlayerArea: SelectedPlayArea | null; // Выбранная игровая зона

  familiar: Card | null; // Карта фамильяра, лежит рядом с планшетом
  wizardBoard: WizardBoard | null; // Планшет колдуна
  wizardPropertyToken: WizardPropertyToken | null; // Жетон колдунского свойства

  putNextCardOnTopOfDeck?: boolean; // Для PutNextBuyingCardOnTopOfDeck
  playAttackOnGetOrBuy?: boolean; // Для EachTimeYouGetOrBuyCardInTernPlayAttack
  firstWizardPlayedThisTurn?: boolean; // Для IfHaveFirstWizardDrawOneCard (постоянные карты)
  firstCreaturePlayedThisTurn?: boolean; // Для IfHaveFirstCreatureDrawOneCard (Замок спрутобойни)
  firstTreasurePlayedThisTurn?: boolean; // Для IfHaveFirstTreasureDrawOneCard (Грибучее болото)
  firstSpellPlayedThisTurn?: boolean; // Для IfHaveFirstSpellDrawOneCard (Хоромы страсти)
}

export interface GameState {
  players: Player[]; // Список всех игроков (от 2 до 5)
  currentPlayer: number; // ID текущего игрока (1, 2, ..., 5)
  turn: number; // Номер текущего хода
  status: 'pending' | 'active' | 'finished'; // Статус игры
  winner?: Player | null; // Победитель (опционально, null если игра не завершена)
  currentMarketplace: Card[]; // Текущие карты на рынке
  marketplace: Card[]; // Оставшиеся карты рынка
  currentLegendaryMarketplace: Card[]; // Текущие легендарные карты на рынке
  legendaryMarketplace: Card[]; // Оставшиеся легендарные карты рынка
  chaosCardDiscard: Card[]; // Стопка уничтоженных карт беспредела
  deadWizardTokens: number; // Количество жетонов дохлых колдунов
  isTopLegendaryCardHidden: boolean; // Закрыта ли верхняя карта легенд
  gameOver: boolean; // Завершена ли игра
  strayMagicDeck: Card[]; // Стопка шальной магии
  sluggishSticksDeck: Card[]; // Стопка вялых палочек
  destroyedCards: Card[]; // Стопка уничтоженных карт (кроме беспредела)
  krutagidonPrize: KrutagidonPrize | null; // Главный приз Крутагидона
  proposedProperties: { [playerId: string]: number[] }; // Хранит ID предложенных свойств для каждого игрока
  proposedFamiliars: { [playerId: string]: number[] }; // Хранит ID предложенных фамильяров для каждого игрока
  proposedPlayAreas: { [playerId: string]: number[] }; // Хранит ID предложенных игровых полей для каждого игрока
  selectionQueue?: number[]; // Очередь выбора игроков (массив userId)
  currentSelectionPlayerIndex?: number; // Индекс текущего игрока в очереди выбора
  // Новое поле для текущей атаки
  pendingAttack?: {
    attackerId: number;
    opponentId: number;
    cardId: number;
    damage: number;
  };
  permanentCards: Card[];
  pendingPlayCard?: {
    playerId: number;
    cardId: number;
  };
  lastBoughtOrGotCardCost?: number; // Стоимость последней купленной или полученной карты
  pendingTopDeckSelection?: {
    playerId: number;
    revealedCards: { enemyId: number; card: Card }[];
  };
  pendingDestroyCardSelection?: {
    playerId: number;
    source: 'hand' | 'discard';
  };
  pendingEnemySelection?: {
    playerId: number;
    action: string;
    targets: number[];
  };
}

export interface Game {
  id: number;
  players: { id: number; username: string }[]; // Список игроков
  gameState: GameState; // Состояние игры
  currentTurn: number; // ID текущего игрока
  currentTurnIndex: number; // Индекс текущего игрока в массиве players
  status: 'pending' | 'active' | 'finished'; // Статус игры
  winner?: { id: number; username: string } | null; // Победитель (опционально)
  moves: Move[]; // Ходы в игре
  cards: Card[]; // Карты, связанные с игрой
}

export enum CardType {
  Seed = 'затравка', // Начальные карты
  Familiar = 'фамильяр', // Фамильяры
  Legend = 'легенда', // Легендарные карты
  Treasure = 'сокровище', // Сокровища
  Wizard = 'волшебник', // Волшебники
  Creature = 'тварь', // Существа
  Spell = 'заклинание', // Заклинания
  Place = 'место', // Места
  ChaosCard = 'ChaosCard', // Ранее lawLessness
  StrayMagic = 'StrayMagic', // Шальная магия
  SluggishStick = 'SluggishStick', // Вялые палочки
}

export enum CardProperty {
  Cthulhu = 'Cthulhu', // Свойство Ктулху
  Necromancy = 'Necromancy', // Некромантия
  AddOnePower = 'addOnePower', // Добавить 1 мощь
  AddTwoPower = 'addTwoPower', // Добавить 2 мощи
  AddThreePower = 'addThreePower', // Добавить 3 мощи
  AddFourPower = 'addFourPower', // Добавить 4 мощи
  AddFivePower = 'addFivePower', // Добавить 5 мощей
  DrawOneCard = 'drawOneCard', // Взять 1 карту
  DrawTwoCard = 'drawTwoCard', // Взять 2 карты
  GainOneHealthForEveryConstant = 'gainOneHealthForEveryConstant', // Получить 1 здоровье за каждую константу
  GainTwoHealth = 'gainTwoHealth', // Получить 2 здоровья
  GainThreeHealth = 'gainThreeHealth', // Получить 3 здоровья
  CardLikeDeadWizard = 'cardLikeDeadWizard', // Карта как мертвый волшебник
  ExpandTopDeckCardAndGainLivesAsItCost = 'expandTopDeckCardAndGainLivesAsItCost', // Раскрыть верхнюю карту колоды и получить здоровье, равное её стоимости
  AddOnePowerForEachDeadWizard = 'addOnePowerForEachDeadWizard', // Добавить 1 мощь за каждого мертвого волшебника
  RemoveOnePowerForEachDeadWizard = 'removeOnePowerForEachDeadWizard', // Убрать 1 мощь за каждого мертвого волшебника
  IfItFirstCardToPlay = 'ifItFirstCardToPlay', // Если это первая сыгранная карта
  DiscardAllCards = 'discardAllCards', // Сбросить все карты
  DrawFourCards = 'drawFourCards', // Взять 4 карты
  IfHaveOverThreeDeadWizardDrawThreeCardsElseAddTwoPower = 'ifHaveOverThreeDeadWizardDrawThreeCardsElseAddTwoPower', // Если больше 3 мертвых волшебников, взять 3 карты, иначе добавить 2 мощи
  DrawThreeCards = 'drawThreeCards', // Взять 3 карты
  PutNextBuyingCardOnTopOfDeck = 'putNextBuyingCardOnTopOfDeck', // Положить следующую покупаемую карту на верх колоды
  YouAndSelectedEnemyDrawOneCard = 'youAndSelectedEnemyDrawOneCard', // Вы и выбранный противник берете по 1 карте
  CanDestroyCardFromDiscard = 'canDestroyCardFromDiscard', // Может уничтожить карту из сброса
  CheckTopDeckCardRemoveGetOrHer = 'checkTopDeckCardRemoveGetOrHer', // Проверить верхнюю карту колоды, убрать, взять или оставить
  CheckTopCardOfHisDeck = 'checkTopCardOfHisDeck',
  DrawOneCardOrReturnToDeck = 'drawOneCardOrReturnToDeck',
  DrawAnyWizardCardFromDiscardOfAddTwoPower = 'drawAnyWizardCardFromDiscardOfAddTwoPower',
  DrawAnyCreatureCardFromDiscardOfAddTwoPower = 'drawAnyCreatureCardFromDiscardOfAddTwoPower',
  DrawAnySpellCardFromDiscardOfAddTwoPower = 'drawAnySpellCardFromDiscardOfAddTwoPower',
  DrawAnyTreasureCardFromDiscardOfAddTwoPower = 'drawAnyTreasureCardFromDiscardOfAddTwoPower',
  EachTimeYouGetOrBuyCardInTernPlayAttack = 'eachTimeYouGetOrBuyCardInTernPlayAttack',

  //place properties
  IfHaveFirstWizardDrawOneCard = 'ifHaveFirstWizardDrawOneCard',
  IfHaveFirstCreatureDrawOneCard = 'ifHaveFirstCreatureDrawOneCard',
  IfHaveFirstTreasureDrawOneCard = 'ifHaveFirstTreasureDrawOneCard',
  IfHaveFirstSpellDrawOneCard = 'ifHaveFirstSpellDrawOneCard',
  DoubleHealingEffects = 'doubleHealingEffects',
  DoubleAttackDamage = 'doubleAttackDamage',
}

export enum CardAttackProperty {
  DealOneDamageToSelectedEnemy = 'dealOneDamageToSelectedEnemy', // Нанести 1 урон выбранному врагу
  DealThreeDamageToSelectedEnemy = 'dealThreeDamageToSelectedEnemy', // Нанести 3 урона выбранному врагу
  DealTwoDamageToSelectedEnemyForEveryDefenseCardInDiscard = 'DealTwoDamageToSelectedEnemyForEveryDefenseCardInDiscard', // Нанести 2 урона выбранному врагу за каждую защитную карту в сбросе
  DealSevenDamageToEachEnemy = 'dealSevenDamageToEachEnemy', // Нанести 7 урона каждому врагу
  DealFiveDamageToLeftAndRightEnemy = 'dealFiveDamageToLeftAndRightEnemy', // Нанести 5 урона левому и правому врагу
  DealSixDamageToLeftAndRightEnemy = 'dealSixDamageToLeftAndRightEnemy', // Нанести 6 урона левому и правому врагу
  DealFiveDamageToSelectedEnemy = 'dealFiveDamageToSelectedEnemy', // Нанести 5 урона каждому врагу, слабее вас
  DealFiveDamageToEachEnemyWeakerThanYou = 'dealFiveDamageToEachEnemyWeakerThanYou', // Нанести 5 урона каждому врагу, слабее вас
  DealTenDamageToSelectedEnemy = 'dealTenDamageToSelectedEnemy', // Нанести 10 урона выбранному врагу
  EnemyGetSluggishStick = 'enemyGetSluggishStick', // Враг получает вялую палочку
  EveryEnemyGetsSluggishStick = 'everyEnemyGetsSluggishStick', // Каждый враг получает вялую палочку
  EveryEnemyDiscardOneCard = 'everyEnemyDiscardOneCard', // Каждый враг получает вялую палочку
  EveryEnemyExpandTopCardOfTheirDeckYouCanDiscardThem = 'everyEnemyExpandTopCardOfTheirDeckYouCanDiscardThem', // Каждый враг раскрывает верхнюю карту своей колоды, вы можете её сбросить
  ForEveryEnemyThatEscapesAttackGainFourHealth = 'forEveryEnemyThatEscapesAttackGainFourHealth', // За каждого врага, избежавшего атаки, получить 4 здоровья
  SelectedEnemyDiscardOneCardOfCostOverFiveIfEnemyEscapeAttackDealFiveDamage = 'selectedEnemyDiscardOneCardOfCostOverFiveIfEnemyEscapeAttackDealFiveDamage', // Выбранный враг сбрасывает карту стоимостью больше 5, если враг избегает атаки, нанести 5 урона
  SelectedEnemyExpandTopCardOfHisDeckDealDamageAsItCost = 'selectedEnemyExpandTopCardOfHisDeckDealDamageAsItCost', // Выбранный враг раскрывает верхнюю карту своей колоды, нанести урон, равный её стоимости
  DealThreeDamageToEveryEnemyForEveryPermanentCard = 'dealThreeDamageToEveryEnemyForEveryPermanentCard',
  SelectedEnemyExpandEveryCardOfHisHandDealDamageAsCostOfMostCostly = 'selectedEnemyExpandEveryCardOfHisHandDealDamageAsCostOfMostCostly',
  GiveCardWithCostZeroFromHandOrDiscardToSelectedEnemyHand = 'giveCardWithCostZeroFromHandOrDiscardToSelectedEnemyHand',
  DealTwoDamageEveryEnemyForEverySluggishStickInControlAndDiscardIfNoDamageDrawOneCard = 'dealTwoDamageEveryEnemyForEverySluggishStickInControlAndDiscardIfNoDamageDrawOneCard',
  DealFourDamageEveryEnemyForEveryLegendInEnemyDiscardIfNoDamageCanDestroyCardInHand = 'dealFourDamageEveryEnemyForEveryLegendInEnemyDiscardIfNoDamageCanDestroyCardInHand',
  DealFourDamageWeakestEnemyIfHisDieNestingTwoDeadWizardSelectOneAndGiveToEnemy = 'dealFourDamageWeakestEnemyIfHisDieNestingTwoDeadWizardSelectOneAndGiveToEnemy',
  DealToSelectedEnemyDamageAsCostBoughtOrGotCard = 'dealToSelectedEnemyDamageAsCostBoughtOrGotCard',
}

export enum CardDefenseProperty {
  DiscardCard = 'discardCard', // Сбросить карту
  DrawOneCard = 'drawOneCard', // Взять 1 карту
  DrawTwoCardAndDiscardOne = 'drawTwoCardAndDiscardOne', // Взять 2 карты и сбросить 1
  CanDestroyCardInHand = 'canDestroyCardInHand', // Может уничтожить карту в руке
  CanDestroyCardInHandOrDiscard = 'canDestroyCardInHandOrDiscard', // Может уничтожить карту в руке
  PutOneCardFromHandOrDiscardToAttackerEnemyDiscard = 'putOneCardFromHandOrDiscardToAttackerEnemyDiscard', // Положить 1 карту из руки или сброса в сброс атакующего врага
  DealTwoDamageToAttackerEnemy = 'dealTwoDamageToAttackerEnemy', // Нанести 2 урона атакующему врагу
  DealFiveDamageToAttackerEnemy = 'dealFiveDamageToAttackerEnemy', // Нанести 5 урона атакующему врагу
  GainThreeHealth = 'gainThreeHealth', // Получить 3 здоровья
}
export enum WizardPropertyEffect {
  SpendFourHealthToDrawCard = 'spendFourHealthToDrawCard', // Потратить 4 жизни, чтобы взять 1 карту
  AddOnePowerEveryTurn = 'addOnePowerEveryTurn', // Получать 1 мощь каждый ход
  GainTwoHealthWhenPlayDefense = 'gainTwoHealthWhenPlayDefense', // Получать 2 здоровья при розыгрыше защитной карты
  DestroyOneCardFromHandOnce = 'destroyOneCardFromHandOnce', // Один раз за игру можно уничтожить карту из руки
  DrawExtraCardEveryTurn = 'drawExtraCardEveryTurn', // Брать доп. карту в начале хода
}
