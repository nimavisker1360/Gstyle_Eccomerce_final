'use client'

import { ChevronUp } from 'lucide-react'
import { Button } from '../ui/button'
import Link from 'next/link'
import { APP_NAME } from '@/lib/constants'

export default function Footer() {
  return (
    <footer className='bg-black  text-white underline-link'>
      <div className='w-full'>
        <Button
          variant='ghost'
          className='bg-gray-800 w-full  rounded-none '
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ChevronUp className='mr-2 h-4 w-4' />
          بازگشت به بالا
        </Button>
      </div>
      <div className='p-4'>
        <div className='flex justify-center  gap-3 text-sm'>
          <Link href='/categories'>دسته‌بندی‌ها</Link>
          <Link href='/page/conditions-of-use'>شرایط استفاده</Link>
          <Link href='/page/privacy-policy'>حریم خصوصی</Link>
          <Link href='/page/help'>راهنما</Link>
        </div>
        <div className='flex justify-center text-sm'>
          <p> © ۲۰۰۰-۲۰۲۴، {APP_NAME}، شرکت یا شرکت‌های وابسته</p>
        </div>
        <div className='mt-8 flex justify-center text-sm text-gray-400'>
          ۱۲۳، خیابان اصلی، هر شهر، کالیفرنیا، کد پستی ۱۲۳۴۵ | +۱ (۱۲۳) ۴۵۶-۷۸۹۰
        </div>
      </div>
    </footer>
  )
}