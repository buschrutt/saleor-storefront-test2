import CheckoutClient from './CheckoutClient';
import { getCheckoutImage } from '@/lib/payload';

export default async function CheckoutPage() {
    const checkoutImage = await getCheckoutImage();

    return <CheckoutClient checkoutImage={checkoutImage} />;
}