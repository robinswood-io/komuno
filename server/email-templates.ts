import type { Idea, Event, User, LoanItem } from '@shared/schema';
import { brandingCore, getShortAppName } from '../lib/config/branding-core';

export interface BrandingCtx {
  primaryColor?: string;
  appName?: string;
  orgFullName?: string;
}

export interface NotificationContext {
  baseUrl: string;
  adminDashboardUrl: string;
  branding?: BrandingCtx;
}

// Styles email construits dynamiquement depuis le branding
function buildEmailStyles(primaryColor: string) {
  return {
    container: 'max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; line-height: 1.6; color: #333;',
    header: `background: ${primaryColor}; color: white; padding: 24px; text-align: center;`,
    title: 'margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;',
    subtitle: 'margin: 8px 0 0 0; font-size: 13px; opacity: 0.85; font-weight: 400;',
    content: 'background: #ffffff; padding: 32px 24px;',
    label: `display: inline-block; background: ${primaryColor}15; color: ${primaryColor}; padding: 4px 10px; border-radius: 3px; font-size: 11px; font-weight: 600; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;`,
    itemTitle: 'font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 16px 0; line-height: 1.4;',
    description: `background: #fafafa; padding: 16px; border-left: 3px solid ${primaryColor}; margin: 16px 0; color: #444; font-size: 14px;`,
    metaInfo: 'margin: 24px 0; padding: 16px 0; border-top: 1px solid #e8e8e8; border-bottom: 1px solid #e8e8e8;',
    metaRow: 'margin: 8px 0; font-size: 14px;',
    metaLabel: 'font-weight: 500; color: #666; display: inline-block; width: 140px;',
    metaValue: 'color: #1a1a1a;',
    button: `display: inline-block; background: ${primaryColor}; color: white; padding: 12px 32px; text-decoration: none; border-radius: 4px; margin: 24px 0; font-weight: 500; font-size: 14px;`,
    note: 'color: #666; font-size: 13px; margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 4px;',
    footer: 'background: #f4f4f4; padding: 20px; text-align: center; color: #666; font-size: 12px;',
  };
}

function getStyles(context: NotificationContext) {
  const primary = context.branding?.primaryColor || brandingCore.colors.primary;
  return buildEmailStyles(primary);
}

function getAppName(context: NotificationContext) {
  return context.branding?.appName || getShortAppName();
}

function getOrgName(context: NotificationContext) {
  return context.branding?.orgFullName || brandingCore.organization.fullName;
}

export function createNewIdeaEmailTemplate(
  idea: Idea, 
  proposedBy: string, 
  context: NotificationContext
): { subject: string; html: string } {
  const s = getStyles(context);
  const subject = `Nouvelle idée : ${idea.title}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="${s.container}">
        <header style="${s.header}">
          <h1 style="${s.title}">${getAppName(context)}</h1>
          <p style="${s.subtitle}">Notification administrative</p>
        </header>

        <main style="${s.content}">
          <div style="${s.label}">Nouvelle idée</div>
          
          <h2 style="${s.itemTitle}">${idea.title}</h2>
          
          ${idea.description ? `
          <div style="${s.description}">
            ${idea.description.replace(/\n/g, '<br>')}
          </div>
          ` : ''}

          <div style="${s.metaInfo}">
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Proposée par</span>
              <span style="${s.metaValue}">${proposedBy}</span>
            </div>
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Contact</span>
              <span style="${s.metaValue}">${idea.proposedByEmail}</span>
            </div>
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Statut</span>
              <span style="${s.metaValue}">${idea.status === 'pending' ? 'En attente' : idea.status}</span>
            </div>
            ${idea.deadline ? `
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Échéance</span>
              <span style="${s.metaValue}">${new Date(idea.deadline).toLocaleDateString('fr-FR')}</span>
            </div>
            ` : ''}
          </div>

          <div style="text-align: center;">
            <a href="${context.adminDashboardUrl}" style="${s.button}">
              Accéder au tableau de bord
            </a>
          </div>

          <div style="${s.note}">
            Cette idée nécessite votre évaluation. Connectez-vous à l'interface d'administration pour la traiter.
          </div>
        </main>

        <footer style="${s.footer}">
          ${getOrgName(context)}<br>
          Notification automatique
        </footer>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export function createNewEventEmailTemplate(
  event: Event, 
  organizer: string, 
  context: NotificationContext
): { subject: string; html: string } {
  const s = getStyles(context);
  const subject = `Nouvel événement : ${event.title}`;

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="${s.container}">
        <header style="${s.header}">
          <h1 style="${s.title}">${getAppName(context)}</h1>
          <p style="${s.subtitle}">Notification administrative</p>
        </header>

        <main style="${s.content}">
          <div style="${s.label}">Nouvel événement</div>
          
          <h2 style="${s.itemTitle}">${event.title}</h2>
          
          ${event.description ? `
          <div style="${s.description}">
            ${event.description.replace(/\n/g, '<br>')}
          </div>
          ` : ''}

          <div style="${s.metaInfo}">
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Organisé par</span>
              <span style="${s.metaValue}">${organizer}</span>
            </div>
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Date</span>
              <span style="${s.metaValue}">${formattedDate}</span>
            </div>
            ${event.location ? `
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Lieu</span>
              <span style="${s.metaValue}">${event.location}</span>
            </div>
            ` : ''}
            ${event.maxParticipants ? `
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Places</span>
              <span style="${s.metaValue}">${event.maxParticipants} participants max</span>
            </div>
            ` : ''}
          </div>

          <div style="text-align: center;">
            <a href="${context.adminDashboardUrl}" style="${s.button}">
              Accéder au tableau de bord
            </a>
          </div>

          <div style="${s.note}">
            Cet événement attend votre validation. Connectez-vous à l'interface d'administration pour l'approuver.
          </div>
        </main>

        <footer style="${s.footer}">
          ${getOrgName(context)}<br>
          Notification automatique
        </footer>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export function createTestEmailTemplate(context?: NotificationContext): { subject: string; html: string } {
  const s = getStyles(context);
  const subject = `Test configuration email - ${getAppName(context)}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="${s.container}">
        <header style="${s.header}">
          <h1 style="${s.title}">${getAppName(context)}</h1>
          <p style="${s.subtitle}">Test de configuration</p>
        </header>

        <main style="${s.content}">
          <h2 style="${s.itemTitle}">Configuration email réussie</h2>
          
          <p>Ce message confirme que la configuration SMTP avec OVH fonctionne correctement.</p>
          
          <div style="${s.metaInfo}">
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Service</span>
              <span style="${s.metaValue}">OVH SMTP</span>
            </div>
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Envoyé le</span>
              <span style="${s.metaValue}">${new Date().toLocaleString('fr-FR')}</span>
            </div>
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Fonctionnalité</span>
              <span style="${s.metaValue}">Notifications automatiques</span>
            </div>
          </div>

          <div style="${s.note}">
            Les notifications par email sont maintenant opérationnelles.
          </div>
        </main>

        <footer style="${s.footer}">
          ${getOrgName(context)}<br>
          Système de notifications automatiques
        </footer>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export function createNewMemberProposalEmailTemplate(
  memberData: {
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
    phone?: string;
    role?: string;
    notes?: string;
    proposedBy: string;
  },
  context: NotificationContext
): { subject: string; html: string } {
  const s = getStyles(context);
  const subject = `Nouveau membre proposé : ${memberData.firstName} ${memberData.lastName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="${s.container}">
        <header style="${s.header}">
          <h1 style="${s.title}">${getAppName(context)}</h1>
          <p style="${s.subtitle}">Notification recrutement</p>
        </header>

        <main style="${s.content}">
          <div style="${s.label}">Nouveau membre proposé</div>
          
          <h2 style="${s.itemTitle}">${memberData.firstName} ${memberData.lastName}</h2>
          
          <div style="${s.metaInfo}">
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Email</span>
              <span style="${s.metaValue}">${memberData.email}</span>
            </div>
            ${memberData.company ? `
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Société</span>
              <span style="${s.metaValue}">${memberData.company}</span>
            </div>
            ` : ''}
            ${memberData.phone ? `
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Téléphone</span>
              <span style="${s.metaValue}">${memberData.phone}</span>
            </div>
            ` : ''}
            ${memberData.role ? `
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Fonction</span>
              <span style="${s.metaValue}">${memberData.role}</span>
            </div>
            ` : ''}
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Proposé par</span>
              <span style="${s.metaValue}">${memberData.proposedBy}</span>
            </div>
          </div>

          ${memberData.notes ? `
          <div style="${s.description}">
            <strong>Notes :</strong><br>
            ${memberData.notes.replace(/\n/g, '<br>')}
          </div>
          ` : ''}

          <div style="text-align: center;">
            <a href="${context.adminDashboardUrl}/members" style="${s.button}">
              Voir dans le CRM
            </a>
          </div>

          <div style="${s.note}">
            Ce nouveau membre a été suggéré et attend votre contact pour intégrer ${brandingCore.organization.name}.
          </div>
        </main>

        <footer style="${s.footer}">
          ${getOrgName(context)}<br>
          Notification automatique
        </footer>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export function createNewLoanItemEmailTemplate(
  loanItem: LoanItem,
  context: NotificationContext
): { subject: string; html: string } {
  const s = getStyles(context);
  const subject = `Nouveau matériel proposé au prêt : ${loanItem.title}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="${s.container}">
        <header style="${s.header}">
          <h1 style="${s.title}">${getAppName(context)}</h1>
          <p style="${s.subtitle}">Notification administrative</p>
        </header>

        <main style="${s.content}">
          <div style="${s.label}">Nouveau matériel au prêt</div>
          
          <h2 style="${s.itemTitle}">${loanItem.title}</h2>
          
          ${loanItem.description ? `
          <div style="${s.description}">
            ${loanItem.description.replace(/\n/g, '<br>')}
          </div>
          ` : ''}

          <div style="${s.metaInfo}">
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Prêté par</span>
              <span style="${s.metaValue}">${loanItem.lenderName}</span>
            </div>
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Proposé par</span>
              <span style="${s.metaValue}">${loanItem.proposedBy}</span>
            </div>
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Contact</span>
              <span style="${s.metaValue}">${loanItem.proposedByEmail}</span>
            </div>
            <div style="${s.metaRow}">
              <span style="${s.metaLabel}">Statut</span>
              <span style="${s.metaValue}">En attente de validation</span>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${context.adminDashboardUrl}" style="${s.button}">
              Accéder au tableau de bord
            </a>
          </div>

          <div style="${s.note}">
            Ce matériel nécessite votre validation avant d'être visible publiquement. Connectez-vous à l'interface d'administration pour le traiter.
          </div>
        </main>

        <footer style="${s.footer}">
          ${getOrgName(context)}<br>
          Notification automatique
        </footer>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}
