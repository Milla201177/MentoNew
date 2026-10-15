import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  // Same values as Payload's defaults, pinned so a future framework default
  // cannot silently loosen the admin login policy.
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
  },
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
