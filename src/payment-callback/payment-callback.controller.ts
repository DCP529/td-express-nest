import { Body, Controller, Get, Post, Res } from "@nestjs/common";
import { Response } from 'express';
import fetch from 'node-fetch';


@Controller('payment-callback')
export class PaymentCallbackController {
  @Post()
  handlePaymentCallback(@Body() callbackData: any, @Res() res: Response) {
    // const { status, paymentsum, paymentcurrency, invoiceid, date, signature, istest } = callbackData;

    console.log('callbackData', callbackData);
    // Проверка подписи и обработка данных в зависимости от статуса оплаты (success или fail)
    // Реализуйте здесь логику обработки оповещения и обновления статуса заказа в вашей базе данных

    return res.status(200).send('OK')
  }

  @Get('/proxy')
  async callback(): Promise<any> {
    const formData = new URLSearchParams();
    formData.append('MerchantLogin', '000209');
    formData.append('nivid', '122');
    formData.append('IsTest', '1');
    formData.append('RequestSum', '2700');
    formData.append('RequestCurrCode', '000');
    formData.append('Desc', 'оплата.заказа.122');
    formData.append('SignatureValue', 'b8720aa391629445b1e3392a2fafa1b3');

    try {
      const response = await fetch('https://www.agroprombank.com/payments/PaymentStart', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      console.log('response', response);

      const responseData = await response.text();
      return responseData;
    } catch (error) {
      throw new Error('Ошибка при обращении к банковскому API');
    }
  }

  @Get('/proxy-json')
  async callbackJson(): Promise<any> {
    const requestData = {
      MerchantLogin: '000209',
      nivid: '122',
      IsTest: '1',
      RequestSum: '2700',
      RequestCurrCode: '000',
      Desc: 'оплата.заказа.122',
      SignatureValue: 'b8720aa391629445b1e3392a2fafa1b3',
    };

    try {
      const response = await fetch('https://www.agroprombank.com/payments/PaymentStart', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.text();
      console.log('responseData', responseData);
      return responseData;
    } catch (error) {
      throw new Error('Ошибка при обращении к банковскому API');
    }
  }
}
