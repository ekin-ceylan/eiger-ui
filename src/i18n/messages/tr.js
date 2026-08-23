/**
 * Turkish (Türkçe) locale messages
 *
 * Contains all validation error messages and UI text in Turkish.
 * Follows the {@link LocaleMessages} interface specification.
 *
 * @type {import('../types.ts').LocaleMessages}
 */
export const trMessages = {
    required: label => `${label || 'Bu alan'} zorunludur.`,
    pattern: label => `Lütfen geçerli bir ${label || 'değer'} giriniz.`,
    minlength: (label, min) => `${label || 'Bu alan'} en az ${min} karakter olmalıdır.`,
    maxlength: (label, max) => `${label || 'Bu alan'} en fazla ${max} karakter olabilir.`,
    min: (label, min) => `${label || 'Bu alan'} ${min} değerinden az olamaz.`,
    max: (label, max) => `${label || 'Bu alan'} ${max} değerinden fazla olamaz.`,
    range: (label, min, max) => `${label || 'Bu alan'} ${min} ile ${max} arasında olmalıdır.`,
    passwordMismatch: label => `${label || 'Şifreler'} eşleşmiyor.`,
    passwordStrengthValidationMessage: label => `${label || 'Şifre'} daha güçlü olmalıdır.`,
    passwordStrengthLabel: (strength = 0) => ['Şifre yok', 'Şifre çok zayıf', 'Şifre zayıf', 'Şifre orta', 'Şifre güçlü'][strength] || 'Şifre yok',
    passwordStrengthAriaLabel: 'Şifre gücü',
    revealPasswordAriaLabel: 'Şifreyi göster',
    hidePasswordAriaLabel: 'Şifreyi gizle',
    clearButtonAriaLabel: 'Değeri temizle',
    noOptionsLabel: 'Kayıt Bulunamadı',
    undoButtonTitle: 'Geri al',
    redoButtonTitle: 'İleri al',
};
