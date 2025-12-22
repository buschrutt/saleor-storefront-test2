import CheckoutClient from './CheckoutClient';
import { getImageAsset } from '@/lib/contentful';

export default async function CheckoutPage() {
    const checkoutImage = await getImageAsset('checkout-illustration');

    return <CheckoutClient checkoutImage={checkoutImage} />;
}
