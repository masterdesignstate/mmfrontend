const rawAdminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'atomsable@gmail.com';

export const ADMIN_EMAILS = rawAdminEmails
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter((email) => email.length > 0);

export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) {
    return false;
  }

  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
};
