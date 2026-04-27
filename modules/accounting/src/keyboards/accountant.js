import { Keyboard, InlineKeyboard } from 'grammy';

export function accountantMenuKeyboard() {
  return new Keyboard()
    .text('💰 Заполнить выплату').text('📋 Посмотреть выплаты').row()
    .text('🛒 Создать закупку').text('📦 Список закупок').row()
    .text('📩 Заявки на аванс').row()
    .text('◀️ Главное меню').row()
    .resized();
}

export function paymentConfirmInline(paymentId) {
  return new InlineKeyboard()
    .text('✅ Подтвердить получение', `pay_confirm_${paymentId}`).row()
    .text('❌ Не подтверждать',       `pay_reject_${paymentId}`);
}

export function cancelAwaitingKeyboard() {
  return new Keyboard().text('🚫 Отменить выплату').row().text('◀️ Главное меню').resized();
}
