import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { saleorFetch } from '@/lib/saleor';

async function getAuthToken(): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get('saleor_session')?.value;
}

/* =========================
GET — load profile
========================= */
export async function GET() {
    const token = await getAuthToken();

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = `
      query Profile {
        me {
          email
          firstName
          lastName
          defaultShippingAddress {
            id
            streetAddress1
            streetAddress2
            city
            postalCode
            countryArea
            country { code }
          }
        }
      }
    `;

    const res = await saleorFetch(query, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return NextResponse.json({ me: res.data.me });
}

/* =========================
POST — update profile
========================= */
export async function POST(req: Request) {
    const token = await getAuthToken();

    if (!token) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    const body = await req.json();

    const {
        firstName,
        lastName,
        password,
        shippingAddress,
    } = body;

    /* ---- update name ---- */
    if (firstName !== undefined || lastName !== undefined) {
        const res = await saleorFetch(
            `
            mutation UpdateAccount($firstName: String, $lastName: String) {
              accountUpdate(input: { firstName: $firstName, lastName: $lastName }) {
                errors { message }
              }
            }
            `,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                variables: {
                    firstName: firstName || null,
                    lastName: lastName || null
                },
            }
        );

        if (res.data.accountUpdate.errors.length) {
            return NextResponse.json(
                { error: res.data.accountUpdate.errors[0].message },
                { status: 400 }
            );
        }
    }

    /* ---- update shipping address ---- */
    if (shippingAddress) {
        // First, get the current address ID
        const getAddressQuery = `
            query GetAddress {
                me {
                    defaultShippingAddress {
                        id
                    }
                }
            }
        `;

        const addressRes = await saleorFetch(getAddressQuery, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const addressId = addressRes.data.me.defaultShippingAddress?.id;

        if (addressId) {
            // Update existing address
            const updateAddressRes = await saleorFetch(
                `
                mutation UpdateAddress($id: ID!, $input: AddressInput!) {
                  accountAddressUpdate(id: $id, input: $input) {
                    errors { message }
                    address { id }
                  }
                }
                `,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    variables: {
                        id: addressId,
                        input: {
                            firstName: firstName || null,
                            lastName: lastName || null,
                            streetAddress1: shippingAddress.streetAddress1 || null,
                            streetAddress2: shippingAddress.streetAddress2 || null,
                            city: shippingAddress.city || null,
                            countryArea: shippingAddress.countryArea || null,
                            postalCode: shippingAddress.postalCode || null,
                            country: shippingAddress.country || null,
                        },
                    },
                }
            );

            if (updateAddressRes.data.accountAddressUpdate.errors.length) {
                return NextResponse.json(
                    { error: updateAddressRes.data.accountAddressUpdate.errors[0].message },
                    { status: 400 }
                );
            }
        } else {
            // Create new address and set as default
            const createAddressRes = await saleorFetch(
                `
                mutation CreateAddress($input: AddressInput!) {
                  accountAddressCreate(input: $input) {
                    errors { message }
                    address { id }
                  }
                }
                `,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    variables: {
                        input: {
                            firstName: firstName || null,
                            lastName: lastName || null,
                            streetAddress1: shippingAddress.streetAddress1 || null,
                            streetAddress2: shippingAddress.streetAddress2 || null,
                            city: shippingAddress.city || null,
                            countryArea: shippingAddress.countryArea || null,
                            postalCode: shippingAddress.postalCode || null,
                            country: shippingAddress.country || null,
                        },
                    },
                }
            );

            if (createAddressRes.data.accountAddressCreate.errors.length) {
                return NextResponse.json(
                    { error: createAddressRes.data.accountAddressCreate.errors[0].message },
                    { status: 400 }
                );
            }

            // Set the new address as default shipping
            const newAddressId = createAddressRes.data.accountAddressCreate.address.id;
            const setDefaultRes = await saleorFetch(
                `
                mutation SetDefaultAddress($id: ID!, $type: AddressTypeEnum!) {
                  accountSetDefaultAddress(id: $id, type: $type) {
                    errors { message }
                  }
                }
                `,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    variables: {
                        id: newAddressId,
                        type: 'SHIPPING',
                    },
                }
            );

            if (setDefaultRes.data.accountSetDefaultAddress.errors.length) {
                return NextResponse.json(
                    { error: setDefaultRes.data.accountSetDefaultAddress.errors[0].message },
                    { status: 400 }
                );
            }
        }
    }

    /* ---- update password ---- */
    if (password?.newPassword) {
        if (!password.currentPassword) {
            return NextResponse.json(
                { error: 'Current password is required' },
                { status: 400 }
            );
        }

        const res = await saleorFetch(
            `
            mutation ChangePassword($old: String!, $new: String!) {
              accountChangePassword(oldPassword: $old, newPassword: $new) {
                errors { message }
              }
            }
            `,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                variables: {
                    old: password.currentPassword,
                    new: password.newPassword,
                },
            }
        );

        if (res.data.accountChangePassword.errors.length) {
            return NextResponse.json(
                { error: res.data.accountChangePassword.errors[0].message },
                { status: 400 }
            );
        }
    }

    return NextResponse.json({ ok: true, message: 'Profile updated successfully' });
}