import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// ─── Encryption helpers (match src/lib/encryption.ts — GCM format) ───────────

const rawKey = (process.env.ENCRYPTION_KEY || '').trim().replace(/^["']|["']$/g, '');
const ENCRYPTION_KEY = rawKey.substring(0, 64);

function getKey(): Buffer {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error(`Invalid ENCRYPTION_KEY (length ${ENCRYPTION_KEY?.length})`);
  }
  return Buffer.from(ENCRYPTION_KEY, 'hex');
}

/** AES-256-GCM — format: iv(24 hex):authTag(32 hex):ciphertext */
function enc(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + cipher.getAuthTag().toString('hex') + ':' + encrypted.toString('hex');
}

/** HMAC-SHA256 — for User.emailHash, Case.clientEmailHash, Case.clientPhoneHash */
function hmac(text: string): string {
  return crypto.createHmac('sha256', getKey()).update(text).digest('hex');
}

/** Plain SHA256 — for Claimant.emailHash, Claimant.nameHash, Claimant.phoneHash */
function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/** Matches createNameHash() in src/lib/claimant.ts */
function mkNameHash(fullName: string): string {
  return sha256(fullName.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
}

// ─── DB client (raw — no Prisma extensions so we encrypt manually) ───────────

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ─── Typed helpers ────────────────────────────────────────────────────────────

interface ClaimantSeed {
  id: string;
  name: string;       // plain text
  lastName: string;   // plain text
  email: string;      // plain text (portal email, or '' if none)
  phone: string;      // plain text
  dob: Date;
  hasPortal: boolean;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not set');

  console.log('🧹 Wiping database...');
  await wipe();
  console.log('✨ Wiped\n');

  // ── 1. Super Admin ──────────────────────────────────────────────────────────
  const superAdminEmail = 'csanders0191@proton.me';
  await prisma.superAdmin.create({
    data: {
      email: superAdminEmail,
      emailHash: hmac(superAdminEmail),
      name: 'Chris Sanders',
      passwordHash: await bcrypt.hash('Password123!', 12),
      active: true,
    },
  });
  console.log('✅ Super admin created');

  // ── 2. Subscription Plans ───────────────────────────────────────────────────
  const freePlan = await prisma.subscriptionPlan.create({
    data: {
      code: 'FREE',
      name: 'Free',
      maxUsers: 5,
      maxActiveClaims: 10,
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
    },
  });
  const enterprisePlan = await prisma.subscriptionPlan.create({
    data: {
      code: 'ENTERPRISE',
      name: 'Enterprise',
      maxUsers: -1,
      maxActiveClaims: -1,
      stripePriceIdMonthly: 'price_enterprise_monthly',
      stripePriceIdYearly: 'price_enterprise_yearly',
    },
  });
  console.log('✅ Subscription plans created');

  // ── 3. Tenants ──────────────────────────────────────────────────────────────
  const blossomTenant = await prisma.tenant.create({
    data: {
      name: 'Blossom & Co',
      slug: 'blossom-co',
      status: 'ACTIVE',
      plan: 'FREE',
      planId: freePlan.id,
      domain: null,
      settings: {
        portalEnabled: true,
        defaultPriority: 2,
        notificationsEmail: 'hr@blossom-co.example.com',
        timezone: 'America/Los_Angeles',
      },
    },
  });

  const meridianTenant = await prisma.tenant.create({
    data: {
      name: 'Meridian Group',
      slug: 'meridian-group',
      status: 'ACTIVE',
      plan: 'ENTERPRISE',
      planId: enterprisePlan.id,
      domain: 'hr.meridiangroup.example.com',
      stripeCustomerId: 'cus_meridian_example',
      stripeSubscriptionId: 'sub_meridian_example',
      subscriptionStatus: 'active',
      currentPeriodEnd: new Date('2026-12-31'),
      billingInterval: 'yearly',
      settings: {
        portalEnabled: true,
        defaultPriority: 2,
        notificationsEmail: 'accommodations@meridiangroup.example.com',
        timezone: 'America/Chicago',
        slaHours: 72,
      },
    },
  });
  console.log('✅ Tenants created');

  // ── 4. Users — Chris Sanders (platform owner, present in both orgs) ──────────
  const chrisEmail = 'csanders0191@proton.me';
  await prisma.user.create({
    data: {
      tenantId: blossomTenant.id,
      email: enc(chrisEmail),
      emailHash: hmac(chrisEmail),
      name: enc('Chris Sanders'),
      passwordHash: await bcrypt.hash('Password123!', 12),
      role: 'ADMIN',
      username: 'csanders',
      active: true,
      theme: 'system',
      preferences: { sidebarCollapsed: false, defaultView: 'list', emailSignature: true },
      notifications: { portalMessages: true, taskDue: true, caseUpdates: true },
      lastLogin: new Date('2025-04-26T10:00:00Z'),
    },
  });

  // ── 5. Users — Blossom & Co (Admin) ────────────────────────────────────────
  const hazelEmail = 'hazel.thornton@blossom-co.com';
  const hazel = await prisma.user.create({
    data: {
      tenantId: blossomTenant.id,
      email: enc(hazelEmail),
      emailHash: hmac(hazelEmail),
      name: enc('Hazel Thornton'),
      passwordHash: await bcrypt.hash('BlossomAdmin1!', 12),
      role: 'ADMIN',
      username: 'hthorn',
      pronouns: 'she/her',
      active: true,
      theme: 'system',
      preferences: { sidebarCollapsed: false, defaultView: 'list', emailSignature: true },
      notifications: { portalMessages: true, taskDue: true, caseUpdates: true },
      emailSignature: '<p>Hazel Thornton | HR Director<br>Blossom &amp; Co | Portland, OR</p>',
      lastLogin: new Date('2025-04-20T09:15:00Z'),
    },
  });
  console.log('✅ Blossom users created (Chris Sanders + Hazel Thornton)');

  // ── 6. Users — Meridian Group (Admin + Auditor + 2 Coordinators) ────────────
  const sterlingEmail  = 'sterling.ashworth@meridian-group.com';
  const quincyEmail    = 'quincy.vance@meridian-group.com';
  const islaEmail      = 'isla.pemberton@meridian-group.com';
  const fletcherEmail  = 'fletcher.rowan@meridian-group.com';

  const sterling = await prisma.user.create({
    data: {
      tenantId: meridianTenant.id,
      email: enc(sterlingEmail),
      emailHash: hmac(sterlingEmail),
      name: enc('Sterling Ashworth'),
      passwordHash: await bcrypt.hash('MeridianAdmin1!', 12),
      role: 'ADMIN',
      username: 'sashworth',
      pronouns: 'they/them',
      active: true,
      theme: 'dark',
      preferences: { sidebarCollapsed: false, defaultView: 'board', emailSignature: true },
      notifications: { portalMessages: true, taskDue: true, caseUpdates: true },
      emailSignature: '<p>Sterling Ashworth | Accessibility Manager<br>Meridian Group | Austin, TX</p>',
      lastLogin: new Date('2025-04-24T14:30:00Z'),
    },
  });

  await prisma.user.create({
    data: {
      tenantId: meridianTenant.id,
      email: enc(quincyEmail),
      emailHash: hmac(quincyEmail),
      name: enc('Quincy Vance'),
      passwordHash: await bcrypt.hash('MeridianAudit1!', 12),
      role: 'AUDITOR',
      username: 'qvance',
      pronouns: 'he/him',
      active: true,
      theme: 'light',
      preferences: { sidebarCollapsed: true, defaultView: 'list', emailSignature: false },
      notifications: { portalMessages: false, taskDue: true, caseUpdates: true },
      emailSignature: '<p>Quincy Vance | Compliance Auditor<br>Meridian Group | Austin, TX</p>',
      lastLogin: new Date('2025-04-22T10:00:00Z'),
    },
  });

  const isla = await prisma.user.create({
    data: {
      tenantId: meridianTenant.id,
      email: enc(islaEmail),
      emailHash: hmac(islaEmail),
      name: enc('Isla Pemberton'),
      passwordHash: await bcrypt.hash('MeridianCoord1!', 12),
      role: 'COORDINATOR',
      username: 'ipemberton',
      pronouns: 'she/her',
      active: true,
      theme: 'system',
      preferences: { sidebarCollapsed: false, defaultView: 'list', emailSignature: true },
      notifications: { portalMessages: true, taskDue: true, caseUpdates: true },
      emailSignature: '<p>Isla Pemberton | Accommodations Coordinator<br>Meridian Group | Denver, CO</p>',
      lastLogin: new Date('2025-04-25T08:45:00Z'),
    },
  });

  const fletcher = await prisma.user.create({
    data: {
      tenantId: meridianTenant.id,
      email: enc(fletcherEmail),
      emailHash: hmac(fletcherEmail),
      name: enc('Fletcher Rowan'),
      passwordHash: await bcrypt.hash('MeridianCoord2!', 12),
      role: 'COORDINATOR',
      username: 'frowan',
      pronouns: 'he/him',
      active: true,
      theme: 'system',
      preferences: { sidebarCollapsed: false, defaultView: 'list', emailSignature: true },
      notifications: { portalMessages: true, taskDue: true, caseUpdates: true },
      emailSignature: '<p>Fletcher Rowan | Accommodations Coordinator<br>Meridian Group | Remote</p>',
      lastLogin: new Date('2025-04-23T16:20:00Z'),
    },
  });
  console.log('✅ Meridian users created');

  // ── 6 & 7. Claimants ────────────────────────────────────────────────────────
  const blossomClaimants = await seedClaimants(blossomTenant.id, BLOSSOM_CLAIMANTS);
  console.log('✅ Blossom claimants created');

  const meridianClaimants = await seedClaimants(meridianTenant.id, MERIDIAN_CLAIMANTS);
  console.log('✅ Meridian claimants created');

  // ── 8. Cases — Blossom & Co ─────────────────────────────────────────────────
  const blossomCases = await seedCases(blossomTenant.id, hazel.id, blossomClaimants, BLOSSOM_CASE_SPECS);
  console.log('✅ Blossom cases created');

  // ── 9. Cases — Meridian Group ───────────────────────────────────────────────
  // Alternate coordinator: Isla=0,2,4 | Fletcher=1,3
  const meridianCases = await seedCases(
    meridianTenant.id,
    isla.id,
    meridianClaimants,
    MERIDIAN_CASE_SPECS,
    [isla.id, fletcher.id, isla.id, fletcher.id, isla.id],
  );
  console.log('✅ Meridian cases created');

  // ── 10. Accommodations ──────────────────────────────────────────────────────
  await seedAccommodations(blossomTenant.id,   blossomCases,   hazel.id,  BLOSSOM_ACCOM_SPECS);
  await seedAccommodations(meridianTenant.id,  meridianCases,  isla.id,   MERIDIAN_ACCOM_SPECS);
  console.log('✅ Accommodations created');

  // ── 11. Notes ───────────────────────────────────────────────────────────────
  await seedNotes(blossomTenant.id,   blossomCases,   hazel.id,   BLOSSOM_NOTES);
  await seedNotes(meridianTenant.id,  meridianCases,  isla.id,    MERIDIAN_NOTES);
  console.log('✅ Notes created');

  // ── 12. Tasks ───────────────────────────────────────────────────────────────
  await seedTasks(blossomTenant.id,   blossomCases,   hazel.id,   undefined,    BLOSSOM_TASKS);
  await seedTasks(meridianTenant.id,  meridianCases,  isla.id,    fletcher.id,  MERIDIAN_TASKS);
  console.log('✅ Tasks created');

  // ── 13. Contacts ────────────────────────────────────────────────────────────
  await seedContacts(blossomTenant.id,   blossomCases,   BLOSSOM_CONTACTS);
  await seedContacts(meridianTenant.id,  meridianCases,  MERIDIAN_CONTACTS);
  console.log('✅ Contacts created');

  // ── 14. Portal Messages (cases 0–3 have portal users; skip case 4) ──────────
  await seedPortalMessages(blossomTenant.id,   blossomCases.slice(0, 4),  hazel.id,  BLOSSOM_MESSAGES);
  await seedPortalMessages(meridianTenant.id,  meridianCases.slice(0, 4), isla.id,   MERIDIAN_MESSAGES);
  console.log('✅ Portal messages created');

  // ── 15. Claim Families ──────────────────────────────────────────────────────
  await prisma.claimFamily.create({
    data: {
      tenantId: blossomTenant.id,
      name: 'Ergonomic & Assistive Tech Bundle',
      cases: { connect: [{ id: blossomCases[0].id }, { id: blossomCases[3].id }] },
    },
  });
  await prisma.claimFamily.create({
    data: {
      tenantId: meridianTenant.id,
      name: 'Physical Accessibility Initiative',
      cases: { connect: [{ id: meridianCases[1].id }, { id: meridianCases[4].id }] },
    },
  });
  console.log('✅ Claim families created');

  console.log('\n🎉 Seeding complete!');
}

// ─── Static seed data ─────────────────────────────────────────────────────────

interface ClaimantSpec {
  claimantNumber: string;
  fullName: string;
  dob: Date;
  phone: string;
  pin: string;
  portalEmail: string | null;
  portalPassword: string | null;
}

const BLOSSOM_CLAIMANTS: ClaimantSpec[] = [
  { claimantNumber: '241837', fullName: 'Periwinkle Garnet', dob: new Date('1985-03-14'), phone: '(555) 134-7892', pin: '4821', portalEmail: 'periwinkle.garnet@gmail.com',   portalPassword: 'Garnet2024!'  },
  { claimantNumber: '583924', fullName: 'Cobalt Marigold',   dob: new Date('1990-07-22'), phone: '(555) 267-3018', pin: '7365', portalEmail: 'cobalt.marigold@outlook.com',   portalPassword: 'Cobalt2024!'  },
  { claimantNumber: '719463', fullName: 'Crimson Slate',     dob: new Date('1978-11-05'), phone: '(555) 389-5164', pin: '2947', portalEmail: 'crimson.slate@yahoo.com',       portalPassword: 'Crimson2024!' },
  { claimantNumber: '362851', fullName: 'Tawny Cerulean',    dob: new Date('1995-02-18'), phone: '(555) 452-9037', pin: '6183', portalEmail: 'tawny.cerulean@proton.me',      portalPassword: 'Tawny2024!'   },
  { claimantNumber: '847209', fullName: 'Vermillion Sage',   dob: new Date('1982-09-30'), phone: '(555) 571-6284', pin: '5429', portalEmail: null,                            portalPassword: null           },
];

const MERIDIAN_CLAIMANTS: ClaimantSpec[] = [
  { claimantNumber: '156748', fullName: 'Ochre Indigo',      dob: new Date('1988-04-12'), phone: '(555) 683-2917', pin: '3572', portalEmail: 'ochre.indigo@gmail.com',        portalPassword: 'Ochre2024!'   },
  { claimantNumber: '923617', fullName: 'Sienna Teal',       dob: new Date('1993-08-27'), phone: '(555) 724-5803', pin: '9146', portalEmail: 'sienna.teal@outlook.com',       portalPassword: 'Sienna2024!'  },
  { claimantNumber: '478293', fullName: 'Umber Lavender',    dob: new Date('1976-12-03'), phone: '(555) 816-4092', pin: '5283', portalEmail: 'umber.lavender@yahoo.com',      portalPassword: 'Umber2024!'   },
  { claimantNumber: '631584', fullName: 'Russet Amber',      dob: new Date('2001-05-19'), phone: '(555) 937-8261', pin: '7614', portalEmail: 'russet.amber@proton.me',        portalPassword: 'Russet2024!'  },
  { claimantNumber: '294076', fullName: 'Chartreuse Noir',   dob: new Date('1984-10-08'), phone: '(555) 048-7143', pin: '8395', portalEmail: null,                            portalPassword: null           },
];

interface CaseSpec {
  caseNumber: string;
  title: string;
  description: string;
  medicalCondition: string;
  category: string;
  jobTitle: string;
  jobFamily: string;
  requestDate: Date;
  medicalDueDate: Date;
  preferredStartDate: string;
  status: string;
  priority: number;
  venue: string;
  program: string;
  closedAt?: Date;
}

const BLOSSOM_CASE_SPECS: CaseSpec[] = [
  {
    caseNumber: 'AA-2025-41837', title: 'Ergonomic Workstation Request',
    description: 'Claimant requires a sit-stand desk and ergonomic keyboard tray due to diagnosed chronic back pain and RSI. Current workstation causes significant daily discomfort that impacts productivity.',
    medicalCondition: 'Chronic back pain and repetitive strain injury (RSI)',
    category: 'PHYSICAL', jobTitle: 'Data Entry Specialist', jobFamily: 'Administrative Support',
    requestDate: new Date('2025-03-10'), medicalDueDate: new Date('2025-04-10'),
    preferredStartDate: '2025-05-01', status: 'OPEN', priority: 2,
    venue: 'Main Office — Floor 2', program: 'Workplace Accommodations Program',
  },
  {
    caseNumber: 'AA-2025-58392', title: 'Remote Work Accommodation',
    description: 'Claimant experiences severe anxiety in open office environments. A permanent remote work arrangement has been recommended by their treating psychiatrist as a reasonable accommodation.',
    medicalCondition: 'Severe anxiety disorder and agoraphobia',
    category: 'SCHEDULE', jobTitle: 'Customer Service Representative', jobFamily: 'Operations',
    requestDate: new Date('2025-02-14'), medicalDueDate: new Date('2025-03-14'),
    preferredStartDate: '2025-04-01', status: 'IN_PROGRESS', priority: 1,
    venue: 'Remote / Work-from-Home', program: 'Workplace Accommodations Program',
  },
  {
    caseNumber: 'AA-2025-71946', title: 'Flexible Schedule Request',
    description: 'Claimant requires a flexible start time no earlier than 10:00 AM to accommodate their morning insulin management routine and periodic endocrinology appointments.',
    medicalCondition: 'Type 1 Diabetes requiring regular medical management',
    category: 'SCHEDULE', jobTitle: 'Marketing Coordinator', jobFamily: 'Marketing & Communications',
    requestDate: new Date('2025-01-28'), medicalDueDate: new Date('2025-02-28'),
    preferredStartDate: '2025-03-15', status: 'PENDING_REVIEW', priority: 2,
    venue: 'Main Office — Floor 3', program: 'Workplace Accommodations Program',
  },
  {
    caseNumber: 'AA-2025-36285', title: 'Screen Reader Software Request',
    description: 'Claimant is experiencing progressive vision loss due to macular degeneration and requires JAWS screen reader software, high-contrast settings, and a large-format display.',
    medicalCondition: 'Progressive vision impairment (macular degeneration)',
    category: 'TECHNOLOGY', jobTitle: 'Financial Analyst', jobFamily: 'Finance & Accounting',
    requestDate: new Date('2025-03-20'), medicalDueDate: new Date('2025-04-20'),
    preferredStartDate: '2025-05-15', status: 'OPEN', priority: 1,
    venue: 'Main Office — Floor 4', program: 'Assistive Technology Initiative',
  },
  {
    caseNumber: 'AA-2025-84720', title: 'Quiet Room Access',
    description: 'Claimant requires designated access to a quiet, low-stimulation workspace to manage sensory overload associated with their autism spectrum and sensory processing disorder diagnoses.',
    medicalCondition: 'Autism spectrum disorder and sensory processing disorder',
    category: 'ENVIRONMENT', jobTitle: 'Software Developer', jobFamily: 'Information Technology',
    requestDate: new Date('2024-11-05'), medicalDueDate: new Date('2024-12-05'),
    preferredStartDate: '2025-01-02', status: 'CLOSED', priority: 3,
    venue: 'Main Office — Quiet Room 3B', program: 'Workplace Accommodations Program',
    closedAt: new Date('2025-02-15'),
  },
];

const MERIDIAN_CASE_SPECS: CaseSpec[] = [
  {
    caseNumber: 'AA-2025-15674', title: 'Ergonomic Assessment and Equipment',
    description: 'Claimant diagnosed with fibromyalgia and chronic fatigue syndrome requires a comprehensive ergonomic workstation assessment, adaptive seating, and anti-fatigue matting.',
    medicalCondition: 'Fibromyalgia and chronic fatigue syndrome',
    category: 'PHYSICAL', jobTitle: 'Project Manager', jobFamily: 'Operations & Strategy',
    requestDate: new Date('2025-04-01'), medicalDueDate: new Date('2025-05-01'),
    preferredStartDate: '2025-06-01', status: 'OPEN', priority: 2,
    venue: 'Meridian HQ — Floor 5', program: 'Employee Wellness & Accommodations',
  },
  {
    caseNumber: 'AA-2025-92361', title: 'Hearing Loop Installation',
    description: 'Claimant with severe bilateral hearing loss requires installation of an induction hearing loop in primary conference rooms on floors 2 and 4.',
    medicalCondition: 'Severe bilateral sensorineural hearing loss',
    category: 'ENVIRONMENT', jobTitle: 'Conference Services Coordinator', jobFamily: 'Administrative & Facilities',
    requestDate: new Date('2025-03-18'), medicalDueDate: new Date('2025-04-18'),
    preferredStartDate: '2025-07-01', status: 'OPEN', priority: 2,
    venue: 'Meridian HQ — Floors 2 & 4 Conference Rooms', program: 'Accessibility Infrastructure Program',
  },
  {
    caseNumber: 'AA-2025-47829', title: 'Reduced Hours Accommodation',
    description: 'Claimant is managing PTSD and MDD under a structured treatment plan. Psychiatrist recommends a temporary reduction from 40 to 28 hours per week for an initial 90-day period.',
    medicalCondition: 'Post-traumatic stress disorder and major depressive disorder',
    category: 'SCHEDULE', jobTitle: 'HR Business Partner', jobFamily: 'Human Resources',
    requestDate: new Date('2025-04-05'), medicalDueDate: new Date('2025-05-05'),
    preferredStartDate: '2025-05-15', status: 'OPEN', priority: 1,
    venue: 'Remote / Hybrid', program: 'Employee Wellness & Accommodations',
  },
  {
    caseNumber: 'AA-2025-63158', title: 'Service Animal Accommodation',
    description: 'Claimant relies on a trained diabetic alert dog to detect blood glucose fluctuations due to hypoglycemia unawareness. The animal must be permitted in all work areas including the lab.',
    medicalCondition: 'Type 1 Diabetes with hypoglycemia unawareness — trained diabetic alert service animal',
    category: 'ANIMAL', jobTitle: 'Lab Technician', jobFamily: 'Research & Development',
    requestDate: new Date('2025-03-28'), medicalDueDate: new Date('2025-04-28'),
    preferredStartDate: '2025-05-12', status: 'OPEN', priority: 2,
    venue: 'Meridian R&D Campus — Lab Building B', program: 'Employee Wellness & Accommodations',
  },
  {
    caseNumber: 'AA-2025-29407', title: 'Physical Workspace Modification',
    description: 'Claimant uses a motorized wheelchair due to MS with lower-limb mobility limitations. Modifications required: accessible height-adjustable desk, wheelchair turning radius clearance, and relocation to Floor 1.',
    medicalCondition: 'Multiple sclerosis with lower-limb mobility limitations (wheelchair user)',
    category: 'PHYSICAL', jobTitle: 'Senior Financial Analyst', jobFamily: 'Finance & Accounting',
    requestDate: new Date('2025-04-10'), medicalDueDate: new Date('2025-05-10'),
    preferredStartDate: '2025-06-15', status: 'OPEN', priority: 1,
    venue: 'Meridian HQ — Floor 1 (relocation from Floor 6)', program: 'Accessibility Infrastructure Program',
  },
];

interface AccomSpec {
  type: string; description: string; status: string;
  cost: string; isLongTerm: boolean; subtype?: string;
}

const BLOSSOM_ACCOM_SPECS: AccomSpec[] = [
  { type: 'PHYSICAL_ACCOMMODATION', description: 'Height-adjustable sit-stand desk (electric, 48"×30") and ergonomic keyboard tray', status: 'PENDING',  cost: '875.00',  isLongTerm: true,  subtype: 'Furniture' },
  { type: 'SCHEDULE_MODIFICATION',  description: 'Permanent full-time remote work arrangement',                                          status: 'PENDING',  cost: '0.00',    isLongTerm: true,  subtype: 'Remote Work' },
  { type: 'SCHEDULE_MODIFICATION',  description: 'Flexible daily start time — no earlier than 10:00 AM',                                 status: 'APPROVED', cost: '0.00',    isLongTerm: false, subtype: 'Flex Time' },
  { type: 'JOB_AID',                description: 'JAWS screen reader software annual license and 27" 4K large-format monitor',            status: 'PENDING',  cost: '1250.00', isLongTerm: true,  subtype: 'Software & Hardware' },
  { type: 'ENVIRONMENTAL_MODIFICATION', description: 'Designated quiet workspace — Room 3B, third floor, core hours 9 AM–5 PM',          status: 'APPROVED', cost: '0.00',    isLongTerm: true,  subtype: 'Space Designation' },
];

const MERIDIAN_ACCOM_SPECS: AccomSpec[] = [
  { type: 'PHYSICAL_ACCOMMODATION',    description: 'Comprehensive ergonomic assessment, adaptive seating, and anti-fatigue matting', status: 'PENDING', cost: '1100.00', isLongTerm: true, subtype: 'Ergonomic Assessment' },
  { type: 'ENVIRONMENTAL_MODIFICATION',description: 'Hearing loop installation in conference rooms — Floors 2 and 4',                 status: 'PENDING', cost: '4800.00', isLongTerm: true, subtype: 'Assistive Infrastructure' },
  { type: 'SCHEDULE_MODIFICATION',     description: 'Temporary hour reduction: 40 → 28 hours per week for 90-day initial period',    status: 'PENDING', cost: '0.00',    isLongTerm: false, subtype: 'Reduced Hours' },
  { type: 'CHANGE_IN_FUNCTIONS',       description: 'Service animal (diabetic alert dog) permitted in all work areas including lab',  status: 'PENDING', cost: '0.00',    isLongTerm: true, subtype: 'Animal Access' },
  { type: 'PHYSICAL_ACCOMMODATION',    description: 'Height-adjustable accessible desk, wheelchair clearance, and Floor 1 relocation', status: 'PENDING', cost: '2200.00', isLongTerm: true, subtype: 'Workspace Modification' },
];

const BLOSSOM_NOTES = [
  ['Medical documentation from Dr. Rivera (orthopedic specialist) received and reviewed. Confirms RSI and chronic back pain diagnosis. Ergonomic assessment scheduled for 2025-05-08. Claimant cooperative and responsive.', 'CASE_UPDATE'],
  ['Psychiatrist letter from Dr. Okonkwo received. Letter clearly recommends permanent remote work as medically necessary. Supervisor briefed and supportive. IT remote access setup has been requested.', 'CASE_UPDATE'],
  ['Endocrinologist note from Dr. Patel reviewed. Medical necessity of flexible scheduling confirmed. HR policy review confirms flex scheduling is within approved accommodation parameters.', 'CASE_UPDATE'],
  ['IT department confirmed JAWS compatibility with existing financial software suite. Procurement order pending final sign-off. 27" 4K monitor sourced from vendor at $350; JAWS license at $900.', 'CASE_UPDATE'],
  ['Quiet Room 3B designated for exclusive claimant use during core hours. Facilities team notified and signage posted. Accommodation confirmed effective by claimant feedback on 2025-02-10. Case closed.', 'CASE_UPDATE'],
];

const MERIDIAN_NOTES = [
  ['Ergonomic assessor (certified OT) scheduled for 2025-05-13. Claimant has provided medical documentation from rheumatologist. Initial intake completed — claimant understands the process timeline.', 'CASE_UPDATE'],
  ['Facilities team notified of hearing loop request. Quote requested from three AV vendors. Projected installation timeline 8–10 weeks pending vendor selection and building access scheduling.', 'CASE_UPDATE'],
  ['Psychiatrist treatment plan received and reviewed. HR policy team consulted on reduced hours precedent. Temporary 28-hour schedule approved pending VP sign-off. Claimant on FMLA concurrently.', 'CASE_UPDATE'],
  ['Service animal policy reviewed with building manager and lab safety officer. Policy permits trained service animals. Allergy survey sent to lab team members. No conflicting allergies reported.', 'CASE_UPDATE'],
  ['Facilities assessment scheduled for end of April. Floor plan reviewed — Floor 1 office 107 identified as suitable relocation target. IT cabling and desk order to be initiated upon approval.', 'CASE_UPDATE'],
];

const BLOSSOM_TASKS = [
  { title: 'Review ergonomic assessment report and approve desk order',          category: 'DOCUMENTATION', priority: 'HIGH',   daysOut: 3  },
  { title: 'Confirm remote IT setup completion with claimant',                   category: 'FOLLOW_UP',     priority: 'HIGH',   daysOut: 5  },
  { title: 'Prepare and issue flexible schedule decision letter',                 category: 'DOCUMENTATION', priority: 'MEDIUM', daysOut: 2  },
  { title: 'Coordinate software procurement and monitor delivery with IT',        category: 'FOLLOW_UP',     priority: 'HIGH',   daysOut: 4  },
  { title: 'Send case closure summary and archive documentation',                 category: 'DOCUMENTATION', priority: 'LOW',    daysOut: 0, completed: true },
];

const MERIDIAN_TASKS = [
  { title: 'Coordinate ergonomic assessment appointment with OT',                 category: 'FOLLOW_UP',     priority: 'HIGH',   daysOut: 7  },
  { title: 'Review hearing loop vendor quotes and select contractor',             category: 'DOCUMENTATION', priority: 'MEDIUM', daysOut: 10 },
  { title: 'Obtain VP sign-off on 90-day reduced hours plan',                     category: 'FOLLOW_UP',     priority: 'HIGH',   daysOut: 3  },
  { title: 'Complete service animal accommodation paperwork and notify facilities',category: 'DOCUMENTATION', priority: 'MEDIUM', daysOut: 4  },
  { title: 'Schedule facilities assessment and initiate desk procurement',         category: 'FOLLOW_UP',     priority: 'HIGH',   daysOut: 6  },
];

const BLOSSOM_CONTACTS = [
  { name: 'Dr. Amelia Rivera',   role: 'Treating Physician',   email: 'a.rivera@portlandmedical.example.com',  phone: '(503) 555-2201', type: 'MEDICAL', address: '1200 NW Burnside St, Portland, OR 97209', notes: 'Orthopedic specialist. Prefers email contact.' },
  { name: 'Dr. Emeka Okonkwo',   role: 'Psychiatrist',         email: 'e.okonkwo@mindcareclinic.example.com',  phone: '(503) 555-3317', type: 'MEDICAL', address: '405 SE Belmont St, Portland, OR 97214',   notes: 'Provides letters with signed release only.' },
  { name: 'Dr. Priya Patel',     role: 'Endocrinologist',      email: 'p.patel@diabetescenter.example.com',    phone: '(503) 555-4482', type: 'MEDICAL', address: '900 NE Halsey St, Portland, OR 97232',    notes: 'Quarterly follow-up schedule in place.' },
  { name: 'Dr. Thomas Blackwell',role: 'Ophthalmologist',      email: 't.blackwell@eyecare.example.com',       phone: '(503) 555-5590', type: 'MEDICAL', address: '620 SW Morrison St, Portland, OR 97205',  notes: 'Annual eye exam — progressive condition.' },
  { name: 'Dr. Lena Morozova',   role: 'Psychiatrist',         email: 'l.morozova@behavioralhealth.example.com',phone: '(503) 555-6613',type: 'MEDICAL', address: '250 SW Taylor St, Portland, OR 97204',    notes: 'Case closed — contact for records only.' },
];

const MERIDIAN_CONTACTS = [
  { name: 'Dr. Fatima Al-Rashid',  role: 'Rheumatologist',       email: 'f.alrashid@rheumatologyaustin.example.com', phone: '(512) 555-1182', type: 'MEDICAL', address: '2500 E MLK Jr Blvd, Austin, TX 78702',   notes: 'Fibromyalgia specialist. Responds within 3 business days.' },
  { name: 'Dr. James Holbrook',    role: 'ENT / Audiologist',    email: 'j.holbrook@hearingcentertx.example.com',    phone: '(512) 555-2293', type: 'MEDICAL', address: '1800 Congress Ave, Austin, TX 78701',    notes: 'Provides audiogram reports on request.' },
  { name: 'Dr. Yvonne Castillo',   role: 'Psychiatrist',         email: 'y.castillo@mentalwellness.example.com',     phone: '(303) 555-3341', type: 'MEDICAL', address: '1600 Glenarm Pl, Denver, CO 80202',      notes: 'Treatment plan updates every 30 days.' },
  { name: 'Dr. Marcus Webb',       role: 'Endocrinologist',      email: 'm.webb@diabetescare.example.com',           phone: '(512) 555-4457', type: 'MEDICAL', address: '3100 Red River St, Austin, TX 78705',    notes: 'Alert dog certification letter on file.' },
  { name: 'Dr. Naomi Ikeda',       role: 'Neurologist',          email: 'n.ikeda@neurohealth.example.com',           phone: '(512) 555-5563', type: 'MEDICAL', address: '4200 Speedway, Austin, TX 78751',        notes: 'MS specialist — annual MRI review schedule.' },
];

interface MessageSpec {
  inboundSubject: string; inboundContent: string;
  outboundSubject?: string; outboundContent?: string;
}

const BLOSSOM_MESSAGES: MessageSpec[] = [
  {
    inboundSubject: 'Status of my desk order',
    inboundContent: 'Hi, I wanted to check on the ergonomic desk that was approved. I haven\'t heard an update in about two weeks. Is there anything I need to do on my end?',
    outboundSubject: 'RE: Status of my desk order',
    outboundContent: 'Hi Periwinkle! The desk has been ordered and is estimated to arrive within 7–10 business days. Our facilities team will reach out to schedule installation. No action needed from you right now — we\'ll keep you posted!',
  },
  {
    inboundSubject: 'Remote setup — VPN access issue',
    inboundContent: 'Hello, I\'m having trouble accessing the internal project management system from home. IT said they would configure VPN access but I still haven\'t received credentials. Can you help expedite this?',
  },
  {
    inboundSubject: 'Appointment change affecting my schedule',
    inboundContent: 'Hello, my endocrinologist has moved my monthly appointments to Thursdays at 9 AM going forward. Will this affect my approved accommodation for a 10:00 AM start time on those days?',
    outboundSubject: 'RE: Appointment change affecting my schedule',
    outboundContent: 'Hi Crimson! Your accommodation covers a flexible start no earlier than 10:00 AM daily, so Thursday appointments at 9 AM are fully within scope. No changes needed — your accommodation remains active as approved.',
  },
  {
    inboundSubject: 'Update on screen reader installation',
    inboundContent: 'It has been about 10 days since the software was approved and I\'m finding it increasingly difficult to use my current setup. Is there a confirmed installation date from IT yet?',
  },
];

const MERIDIAN_MESSAGES: MessageSpec[] = [
  {
    inboundSubject: 'Ergonomic assessment — confirmation needed',
    inboundContent: 'Hi, I received a notice that an ergonomic assessor may be coming on May 13th, but I have a conflicting project meeting that morning. Can we confirm or possibly reschedule the appointment time?',
    outboundSubject: 'RE: Ergonomic assessment — confirmation needed',
    outboundContent: 'Hi Ochre! The assessment is confirmed for May 13th at 2:00 PM — no conflict with your morning meeting. I\'ll send you a calendar invite shortly. Please let me know if you need anything else.',
  },
  {
    inboundSubject: 'Hearing loop — conference room access',
    inboundContent: 'Hello, I want to make sure the hearing loop will also cover the smaller breakout rooms on Floor 4, not just the main conference room. Is that included in the current installation plan?',
  },
  {
    inboundSubject: 'Hours reduction start date',
    inboundContent: 'Hi, I wanted to confirm when the reduced hours accommodation will officially start. My supervisor mentioned May 15th but I haven\'t received anything in writing yet. Can you confirm?',
    outboundSubject: 'RE: Hours reduction start date',
    outboundContent: 'Hi Umber! Your reduced hours accommodation is confirmed to begin May 15, 2025. The formal letter will be sent via email within 2 business days. Please reach out if you have any questions before then.',
  },
  {
    inboundSubject: 'Service animal — lab badge access',
    inboundContent: 'Hi, I\'m wondering if my service dog will need a separate ID tag or badge for the R&D lab building. Security asked me about this when I came in last week and I wasn\'t sure of the answer.',
  },
];

// ─── Seeder functions ─────────────────────────────────────────────────────────

async function seedClaimants(tenantId: string, specs: ClaimantSpec[]): Promise<ClaimantSeed[]> {
  const results: ClaimantSeed[] = [];

  for (const s of specs) {
    const hasPortal = s.portalEmail !== null;
    const pEmail    = s.portalEmail?.toLowerCase() ?? null;
    const pHash     = hasPortal && s.portalPassword ? await bcrypt.hash(s.portalPassword, 12) : null;
    const pinHash   = await bcrypt.hash(s.pin, 12);
    const lastName  = s.fullName.split(' ').pop()!;

    const record = await prisma.claimant.create({
      data: {
        tenantId,
        claimantNumber: s.claimantNumber,
        name:      enc(s.fullName),
        nameHash:  mkNameHash(s.fullName),
        birthdate: s.dob,
        email:     pEmail ? enc(pEmail) : null,
        emailHash: pEmail ? sha256(pEmail) : null,
        phone:     enc(s.phone),
        phoneHash: sha256(s.phone.replace(/\D/g, '')),
        pinHash,
        credentialType: 'PIN',
        passwordHash: pHash,
      },
    });

    results.push({
      id:       record.id,
      name:     s.fullName,
      lastName,
      email:    pEmail ?? '',
      phone:    s.phone,
      dob:      s.dob,
      hasPortal,
    });
  }

  return results;
}

async function seedCases(
  tenantId: string,
  defaultCreatorId: string,
  claimants: ClaimantSeed[],
  specs: CaseSpec[],
  creatorIds?: string[],
) {
  const cases = [];

  for (let i = 0; i < specs.length; i++) {
    const s  = specs[i];
    const cl = claimants[i];
    const creatorId = creatorIds?.[i] ?? defaultCreatorId;

    const c = await prisma.case.create({
      data: {
        tenantId,
        caseNumber:       s.caseNumber,
        clientName:       enc(cl.name),
        clientLastName:   enc(cl.lastName),
        clientEmail:      cl.email ? enc(cl.email) : enc(`${cl.name.toLowerCase().replace(' ', '.')}@example.com`),
        clientEmailHash:  cl.email ? hmac(cl.email) : hmac(`${cl.name.toLowerCase().replace(' ', '.')}@example.com`),
        clientPhone:      enc(cl.phone),
        clientPhoneHash:  hmac(cl.phone),
        clientBirthdate:  cl.dob,
        title:            s.title,
        description:      s.description,
        medicalCondition: s.medicalCondition,
        category:         s.category,
        program:          s.program,
        venue:            s.venue,
        jobTitle:         s.jobTitle,
        jobFamily:        s.jobFamily,
        requestDate:      s.requestDate,
        medicalDueDate:   s.medicalDueDate,
        preferredStartDate: s.preferredStartDate,
        status:           s.status as any,
        priority:         s.priority,
        createdById:      creatorId,
        claimantRef:      cl.id,
        closedAt:         s.closedAt ?? null,
      },
    });

    cases.push(c);
  }

  return cases;
}

async function seedAccommodations(
  tenantId: string,
  cases: any[],
  reviewerId: string,
  specs: AccomSpec[],
) {
  for (let i = 0; i < cases.length; i++) {
    const s = specs[i];
    const approved = s.status === 'APPROVED';

    await prisma.accommodation.create({
      data: {
        tenantId,
        caseId:             cases[i].id,
        accommodationNumber: '001',
        type:               s.type as any,
        subtype:            s.subtype ?? null,
        description:        s.description,
        status:             s.status as any,
        lifecycleStatus:    approved ? 'CLOSED' : 'OPEN',
        lifecycleSubstatus: approved ? 'APPROVED' : 'PENDING',
        isLongTerm:         s.isLongTerm,
        startDate:          new Date('2025-05-01'),
        endDate:            approved && !s.isLongTerm ? new Date('2025-11-01') : null,
        reviewDate:         new Date('2025-11-01'),
        estimatedCost:      s.cost,
        actualCost:         approved ? s.cost : null,
        decisionDate:       approved ? new Date('2025-03-01') : null,
        decisionMakerId:    approved ? reviewerId : null,
        decisionLogic:      approved ? { reason: 'Accommodation is reasonable and does not cause undue hardship.', approvedBy: reviewerId } : null,
        isExternal:         false,
        costCode:           approved ? `ACC-2025-${String(i + 1).padStart(3, '0')}` : null,
      },
    });
  }
}

async function seedNotes(
  tenantId: string,
  cases: any[],
  authorId: string,
  notePairs: string[][],
) {
  for (let i = 0; i < cases.length; i++) {
    const [mainNote, noteType] = notePairs[i];

    await prisma.note.create({
      data: {
        tenantId,
        caseId:   cases[i].id,
        authorId,
        content:  enc(mainNote),
        noteType: noteType ?? 'CASE_UPDATE',
      },
    });

    // Intake note on every case
    await prisma.note.create({
      data: {
        tenantId,
        caseId:   cases[i].id,
        authorId,
        content:  enc(`Initial intake call completed with claimant on ${cases[i].createdAt.toLocaleDateString()}. Claimant was informed of the interactive process timeline and their rights under applicable accommodation policy. Next step: await medical documentation.`),
        noteType: 'INTAKE',
      },
    });
  }
}

async function seedTasks(
  tenantId: string,
  cases: any[],
  primaryId: string,
  secondaryId: string | undefined,
  taskSpecs: Array<{ title: string; category: string; priority: string; daysOut: number; completed?: boolean }>,
) {
  for (let i = 0; i < cases.length; i++) {
    const s        = taskSpecs[i];
    const assignee = secondaryId && i % 2 === 1 ? secondaryId : primaryId;
    const isComplete = !!s.completed;

    await prisma.task.create({
      data: {
        tenantId,
        caseId:       cases[i].id,
        title:        s.title,
        description:  `For case ${cases[i].caseNumber}: ${s.title}. Ensure all documentation is complete and the claimant is notified of any decisions within the required SLA window.`,
        status:       isComplete ? 'COMPLETED' : 'PENDING',
        priority:     s.priority,
        category:     s.category as any,
        dueDate:      new Date(Date.now() + s.daysOut * 24 * 60 * 60 * 1000),
        completedAt:  isComplete ? new Date() : null,
        assignedToId: assignee,
        createdById:  primaryId,
        color:        s.priority === 'HIGH' ? '#ef4444' : s.priority === 'LOW' ? '#22c55e' : '#8b5cf6',
      },
    });
  }
}

async function seedContacts(
  tenantId: string,
  cases: any[],
  contacts: Array<{ name: string; role: string; email: string; phone: string; type: string; address: string; notes: string }>,
) {
  for (let i = 0; i < cases.length; i++) {
    const c = contacts[i];
    await prisma.contact.create({
      data: {
        tenantId,
        caseId:  cases[i].id,
        name:    c.name,
        role:    c.role,
        email:   c.email,
        phone:   c.phone,
        type:    c.type,
        address: c.address,
        notes:   c.notes,
      },
    });
  }
}

async function seedPortalMessages(
  tenantId: string,
  cases: any[],
  examinerId: string,
  messages: MessageSpec[],
) {
  const ago = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  for (let i = 0; i < Math.min(cases.length, messages.length); i++) {
    const m = messages[i];

    await prisma.message.create({
      data: {
        tenantId,
        caseId:      cases[i].id,
        subject:     m.inboundSubject,
        content:     m.inboundContent,
        direction:   'PORTAL_INBOUND',
        recipientId: examinerId,
        isExternal:  false,
        read:        !!m.outboundContent,
        createdAt:   ago(3),
      },
    });

    if (m.outboundSubject && m.outboundContent) {
      await prisma.message.create({
        data: {
          tenantId,
          caseId:    cases[i].id,
          subject:   m.outboundSubject,
          content:   m.outboundContent,
          direction: 'PORTAL_OUTBOUND',
          senderId:  examinerId,
          isExternal: false,
          read:      true,
          createdAt: ago(2),
        },
      });
    }
  }
}

// ─── Wipe ─────────────────────────────────────────────────────────────────────

async function wipe() {
  const del = async (fn: () => Promise<any>, label: string) => {
    try { await fn(); }
    catch (e) { console.warn(`  ⚠️  ${label}: ${(e as Error).message.split('\n')[0]}`); }
  };

  await del(() => prisma.messageFolderAssignment.deleteMany(), 'messageFolderAssignment');
  await del(() => prisma.messageAttachment.deleteMany(),       'messageAttachment');
  await del(() => prisma.inboundRuleFolder.deleteMany(),       'inboundRuleFolder');
  await del(() => prisma.inboundRule.deleteMany(),             'inboundRule');
  await del(() => prisma.messageFolder.deleteMany(),           'messageFolder');
  await del(() => prisma.reminder.deleteMany(),                'reminder');
  await del(() => prisma.meetingAttendee.deleteMany(),         'meetingAttendee');
  await del(() => prisma.meeting.deleteMany(),                 'meeting');
  await del(() => prisma.annotationComment.deleteMany(),       'annotationComment');
  await del(() => prisma.task.deleteMany(),                    'task');
  await del(() => prisma.callRequest.deleteMany(),             'callRequest');
  await del(() => prisma.note.deleteMany(),                    'note');
  await del(() => prisma.document.deleteMany(),                'document');
  await del(() => prisma.inventoryItem.deleteMany(),           'inventoryItem');
  await del(() => prisma.accommodation.deleteMany(),           'accommodation');
  await del(() => prisma.contact.deleteMany(),                 'contact');
  await del(() => prisma.message.deleteMany(),                 'message');
  await del(() => prisma.auditLog.deleteMany(),                'auditLog');
  await del(() => prisma.identityVerification.deleteMany(),    'identityVerification');
  await del(() => prisma.consultationRequest.deleteMany(),     'consultationRequest');
  await del(() => prisma.reportExportPayment.deleteMany(),     'reportExportPayment');
  await del(() => prisma.bugReport.deleteMany(),               'bugReport');
  await del(() => prisma.errorLog.deleteMany(),                'errorLog');
  await del(() => prisma.case.deleteMany(),                    'case');
  await del(() => prisma.claimFamily.deleteMany(),             'claimFamily');
  await del(() => prisma.claimant.deleteMany(),                'claimant');
  await del(() => prisma.documentTemplate.deleteMany(),        'documentTemplate');
  await del(() => prisma.client.deleteMany(),                  'client');
  await del(() => prisma.user.deleteMany(),                    'user');
  await del(() => prisma.superAdmin.deleteMany(),              'superAdmin');
  await del(() => prisma.tenant.deleteMany(),                  'tenant');
  await del(() => prisma.subscriptionPlan.deleteMany(),        'subscriptionPlan');
}

// ─── Entry point ─────────────────────────────────────────────────────────────

main()
  .catch((e) => { console.error('❌ Seeding failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
