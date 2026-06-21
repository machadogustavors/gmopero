'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InvoiceDetailRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/service-orders');
  }, [router]);
  return null;
}
