import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      settings: {
        title: "Settings",
        account: "Account",
        notifications: "Notifications",
        security: "Security",
        regional: "Regional Settings",
        preferences: "Preferences",
        saveChanges: "Save Changes",
        cancel: "Cancel",
        accountSettings: "Account Settings",
        personalInfo: "Personal Information",
        firstName: "First Name",
        lastName: "Last Name",
        email: "Email",
        phone: "Phone",
        notificationSettings: "Notification Settings",
        emailNotifications: "Email Notifications",
        emailNotificationsDesc: "Receive updates via email",
        pushNotifications: "Push Notifications",
        pushNotificationsDesc: "Receive browser notifications",
        weeklyDigest: "Weekly Digest",
        weeklyDigestDesc: "Weekly summary of activity",
        marketingEmails: "Marketing Emails",
        marketingEmailsDesc: "Receive promotional content",
        securitySettings: "Security Settings",
        changePassword: "Change Password",
        currentPassword: "Current Password",
        newPassword: "New Password",
        confirmPassword: "Confirm New Password",
        twoFactorAuth: "Two-Factor Authentication",
        twoFactorAuthDesc: "Add an extra layer of security to your account",
        enable2FA: "Enable 2FA",
        regionalSettings: "Regional Settings",
        language: "Language",
        country: "Country",
        timezone: "Timezone",
        dateFormat: "Date Format",
        displaySettings: "Display Settings",
        darkMode: "Dark Mode",
        darkModeDesc: "Switch between light and dark theme",
        compactView: "Compact View",
        compactViewDesc: "Show more data with less spacing",
        settingsSaved: "Settings saved",
        settingsSavedDesc: "Your preferences have been updated successfully."
      },
      navbar: {
        forJobSeekers: "For Job Seekers",
        forEmployers: "For Employers",
        searchPlaceholder: "Search skills, jobs, or people..."
      }
    }
  },
  af: {
    translation: {
      settings: {
        title: "Instellings",
        account: "Rekening",
        notifications: "Kennisgewings",
        security: "Sekuriteit",
        regional: "Streeksinstellings",
        preferences: "Voorkeure",
        saveChanges: "Stoor Veranderinge",
        cancel: "Kanselleer",
        accountSettings: "Rekening Instellings",
        personalInfo: "Persoonlike Inligting",
        firstName: "Voornaam",
        lastName: "Van",
        email: "E-pos",
        phone: "Telefoon",
        language: "Taal",
        country: "Land",
        timezone: "Tydsone",
        dateFormat: "Datumformaat",
        darkMode: "Donker Modus",
        darkModeDesc: "Skakel tussen lig en donker tema",
        compactView: "Kompakte Aansig",
        compactViewDesc: "Wys meer data met minder spasie",
        settingsSaved: "Instellings gestoor",
        settingsSavedDesc: "Jou voorkeure is suksesvol opgedateer."
      }
    }
  },
  zu: {
    translation: {
      settings: {
        title: "Izilungiselelo",
        account: "I-akhawunti",
        notifications: "Izaziso",
        security: "Ukuphepha",
        regional: "Izilungiselelo Zesifunda",
        preferences: "Okuthandwayo",
        saveChanges: "Londoloza Izinguquko",
        cancel: "Khansela",
        language: "Ulimi",
        country: "Izwe",
        darkMode: "Imodi Emnyama",
        darkModeDesc: "Shintsha phakathi kwezihloko ezikhanya nezimnyama"
      }
    }
  },
  xh: {
    translation: {
      settings: {
        title: "Iisetingi",
        account: "I-akhawunti",
        notifications: "Izaziso",
        security: "Ukhuseleko",
        regional: "Iisetingi Zommandla",
        preferences: "Izinto Ozikhethayo",
        saveChanges: "Gcina Utshintsho",
        cancel: "Rhoxisa",
        language: "Ulwimi",
        country: "Ilizwe"
      }
    }
  },
  es: {
    translation: {
      settings: {
        title: "Configuración",
        account: "Cuenta",
        notifications: "Notificaciones",
        security: "Seguridad",
        regional: "Configuración Regional",
        preferences: "Preferencias",
        saveChanges: "Guardar Cambios",
        cancel: "Cancelar",
        language: "Idioma",
        country: "País",
        darkMode: "Modo Oscuro",
        darkModeDesc: "Cambiar entre tema claro y oscuro"
      }
    }
  },
  fr: {
    translation: {
      settings: {
        title: "Paramètres",
        account: "Compte",
        notifications: "Notifications",
        security: "Sécurité",
        regional: "Paramètres Régionaux",
        preferences: "Préférences",
        saveChanges: "Enregistrer les Modifications",
        cancel: "Annuler",
        language: "Langue",
        country: "Pays",
        darkMode: "Mode Sombre",
        darkModeDesc: "Basculer entre thème clair et sombre"
      }
    }
  },
  de: {
    translation: {
      settings: {
        title: "Einstellungen",
        account: "Konto",
        notifications: "Benachrichtigungen",
        security: "Sicherheit",
        regional: "Regionale Einstellungen",
        preferences: "Präferenzen",
        saveChanges: "Änderungen Speichern",
        cancel: "Abbrechen",
        language: "Sprache",
        country: "Land"
      }
    }
  },
  pt: {
    translation: {
      settings: {
        title: "Configurações",
        account: "Conta",
        notifications: "Notificações",
        security: "Segurança",
        regional: "Configurações Regionais",
        preferences: "Preferências",
        saveChanges: "Salvar Alterações",
        cancel: "Cancelar",
        language: "Idioma",
        country: "País"
      }
    }
  },
  zh: {
    translation: {
      settings: {
        title: "设置",
        account: "账户",
        notifications: "通知",
        security: "安全",
        regional: "区域设置",
        preferences: "偏好设置",
        saveChanges: "保存更改",
        cancel: "取消",
        language: "语言",
        country: "国家"
      }
    }
  },
  ar: {
    translation: {
      settings: {
        title: "الإعدادات",
        account: "الحساب",
        notifications: "الإشعارات",
        security: "الأمان",
        regional: "الإعدادات الإقليمية",
        preferences: "التفضيلات",
        saveChanges: "حفظ التغييرات",
        cancel: "إلغاء",
        language: "اللغة",
        country: "البلد"
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
