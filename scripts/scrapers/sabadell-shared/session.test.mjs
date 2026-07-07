import { describe, it, expect } from 'vitest'
import { classifyLoginState } from './session.mjs'

// Tabla de verdad de la clasificación del login (#286). `classifyLoginState` es
// pura: recibe las señales del DOM ya leídas y decide el estado, con la
// precedencia device_confirmation → otp → retry → ok.
describe('classifyLoginState', () => {
  it('modal "Confirmar dispositivo" → device_confirmation (precede a todo)', () => {
    // El lightbox SCA reemplaza al form: a veces #password ya no está, pero aunque
    // siguiera visible el modal manda (es la acción real, #286).
    expect(classifyLoginState({ otpVisible: false, deviceModalVisible: true, passwordVisible: false })).toBe('device_confirmation')
    expect(classifyLoginState({ otpVisible: false, deviceModalVisible: true, passwordVisible: true })).toBe('device_confirmation')
    expect(classifyLoginState({ otpVisible: true, deviceModalVisible: true, passwordVisible: false })).toBe('device_confirmation')
  })

  it('OTP visible (sin modal) → otp', () => {
    expect(classifyLoginState({ otpVisible: true, deviceModalVisible: false, passwordVisible: false })).toBe('otp')
    // OTP precede a retry aunque el password siga en el DOM.
    expect(classifyLoginState({ otpVisible: true, deviceModalVisible: false, passwordVisible: true })).toBe('otp')
  })

  it('solo password visible → retry (login no completado, transitorio)', () => {
    expect(classifyLoginState({ otpVisible: false, deviceModalVisible: false, passwordVisible: true })).toBe('retry')
  })

  it('ninguna señal visible → ok (login completado)', () => {
    expect(classifyLoginState({ otpVisible: false, deviceModalVisible: false, passwordVisible: false })).toBe('ok')
  })
})
