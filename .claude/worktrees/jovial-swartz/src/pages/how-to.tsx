import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import AssistantChat from '@/features/assistant/components/AssistantChat';

const HowToPage = () => {
    const { t } = useTranslation();

    const sections = [
        {
            id: 'methodology',
            icon: 'pi pi-compass',
            title: t('howto.methodology.title'),
            desc: t('howto.methodology.desc'),
            color: 'var(--accent)'
        },
        {
            id: 'timer',
            icon: 'pi pi-clock',
            title: t('howto.timer.title'),
            desc: t('howto.timer.desc'),
            color: 'var(--accent-secondary)'
        },
        {
            id: 'kanban',
            icon: 'pi pi-th-large',
            title: t('howto.kanban.title'),
            desc: t('howto.kanban.desc'),
            color: '#fbbf24' // Amber
        },
        {
            id: 'ai',
            icon: 'pi pi-sparkles',
            title: t('howto.ai.title'),
            desc: t('howto.ai.desc'),
            color: '#a78bfa' // Purple
        }
    ];

    return (
        <MainLayout>
            <div className="howto-page animate-fade-in">
                <header className="howto-page__header">
                    <h1 className="howto-page__title">{t('howto.title')}</h1>
                    <p className="howto-page__subtitle">{t('howto.subtitle')}</p>
                </header>

                <div className="howto-page__grid">
                    {sections.map((section) => (
                        <div key={section.id} className="howto-card glass animate-slide-up">
                            <div
                                className="howto-card__icon-wrapper"
                                style={{ backgroundColor: `${section.color}15`, color: section.color }}
                            >
                                <i className={`${section.icon} howto-card__icon`} />
                            </div>
                            <h3 className="howto-card__title">{section.title}</h3>
                            <p className="howto-card__desc">{section.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="howto-page__footer glass animate-slide-up">
                    <p>
                        {t('common.appName')} — {new Date().getFullYear()}
                    </p>
                </div>
            </div>
            <AssistantChat />
        </MainLayout>
    );
};

export default HowToPage;
