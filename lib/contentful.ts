import { createClient } from 'contentful';

export const contentful = createClient({
    space: process.env.CONTENTFUL_SPACE_ID!,
    accessToken: process.env.CONTENTFUL_DELIVERY_TOKEN!,
});

export async function getImageAsset(key: string) {
    const res = await contentful.getEntries({
        content_type: 'imageAsset',
        'fields.key': key,
        limit: 1,
    });

    const item = res.items[0];
    if (!item) return null;

    return {
        imageUrl: item.fields.imageUrl as string,
        alt: (item.fields.alt as string) ?? '',
    };
}
