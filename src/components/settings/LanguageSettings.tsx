import React from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/lib/i18n';

const LanguageSettings: React.FC = () => {
    const { t, i18n } = useTranslation();

    return (
        <div className="flex flex-col gap-3">
            <header>
                <h4 className="text-sm font-medium text-[#F0F0F0] mb-1">{t("settings.language")}</h4>
                <p className="text-xs text-[#757575]">{t("settings.languageDesc")}</p>
            </header>
            <div className="flex gap-2">
                <button
                    onClick={() => changeLanguage('tr')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium transition-all duration-200
                        ${i18n.language === 'tr'
                            ? 'bg-[#4F8EF7]/10 border-[#4F8EF7]/30 text-[#4F8EF7]'
                            : 'bg-transparent border-[#3D3D3D] text-[#757575] hover:border-[#353535] hover:text-[#9A9A9A]'
                        }`}
                >
                    <span className="text-base">🇹🇷</span>
                    <span>Türkçe</span>
                </button>
                <button
                    onClick={() => changeLanguage('en')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium transition-all duration-200
                        ${i18n.language === 'en'
                            ? 'bg-[#4F8EF7]/10 border-[#4F8EF7]/30 text-[#4F8EF7]'
                            : 'bg-transparent border-[#3D3D3D] text-[#757575] hover:border-[#353535] hover:text-[#9A9A9A]'
                        }`}
                >
                    <span className="text-base">🇬🇧</span>
                    <span>English</span>
                </button>
            </div>
        </div>
    );
};

export default LanguageSettings;
