import { Types } from 'mongoose';
import { Person, IPerson } from '../../models/Person';
import { toObjectId } from '../../utils/mongooseHelpers';

/**
 * Resolves a canonical Person for the given authenticated user within an organization.
 *
 * - If a Person already links to the authUserId, it is returned.
 * - If no link exists but a unique Person with the same primaryEmail is found, the authUserId is attached and the Person is returned.
 * - If no Person exists and sufficient identity info (email + name) is provided, a placeholder Person is created.
 * - If multiple candidates are found at any step, the resolver throws to avoid duplicate creation (safe‑fail).
 */
export class PersonResolver {
  /**
   * Resolve or create a Person.
   * @param authUserId   Authenticated user identifier (Mongo ObjectId string).
   * @param organizationId   Tenant identifier (ObjectId string).
   * @param email   Primary email from the authenticated context (optional).
   * @param name   Display name from the authenticated context (optional).
   * @returns The canonical Person _id as a string.
   */
  async resolve(
    authUserId: string,
    organizationId: string,
    email?: string,
    name?: string
  ): Promise<string> {
    // 1️⃣ Try to find by linked authUserId
    const byUser = await Person.find({ organizationId, userIds: toObjectId(authUserId) });
    if (byUser.length === 1) {
      return byUser[0]._id.toString();
    }
    if (byUser.length > 1) {
      throw new Error('Ambiguous Person mapping: multiple records linked to the same authUserId');
    }

    // 2️⃣ If email is supplied, attempt a unique email match
    if (email) {
      const byEmail = await Person.find({ organizationId, primaryEmail: email });
      if (byEmail.length === 1) {
        const person = byEmail[0] as IPerson;
        // Attach authUserId if not already present
        const objId = toObjectId(authUserId);
        if (!person.userIds.some(id => id.equals(objId))) {
          person.userIds.push(objId);
          await person.save();
        }
        return person._id.toString();
      }
      if (byEmail.length > 1) {
        throw new Error('Ambiguous Person mapping: multiple records with the same email');
      }
    }

    // 3️⃣ Create a placeholder when we have enough info (email + name)
    if (email && name) {
      const newPerson = await Person.create({
        organizationId: toObjectId(organizationId),
        primaryName: name,
        primaryEmail: email,
        userIds: [toObjectId(authUserId)],
      } as IPerson);
      return newPerson._id.toString();
    }

    // 4️⃣ Insufficient data to safely resolve or create a Person
    throw new Error('Unable to resolve Person: insufficient identity information');
  }
}
