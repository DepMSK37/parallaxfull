import { Keyboard, InlineKeyboard } from 'grammy';

export function employeeMenuKeyboard() {
  return new Keyboard()
    .text('📋 Мои выплаты').text('📩 Заявка на аванс').row()
    .text('◀️ Главное меню').row()
    .resized();
}

export function advanceConfirmInline(advanceId) {
  return new InlineKeyboard()
    .text('✅ Отправить заявку', `adv_send_${advanceId}`).row()
    .text('◀️ Назад', 'back');
}
