import { IProcesarFacturaStrategy } from "./factura-procesar.strategy.interface";
import { FacturaProcesamientoResult, FacturaProcesamientoInput} from "./factura-procesar.strategy.interface";
import { Injectable } from "@nestjs/common";
import { Jimp } from 'jimp';
import jsQR from 'jsqr';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class ProcesarFacturaQRStrategy implements IProcesarFacturaStrategy {

    private qrUrlFound: string | null = null;
    async canHandle(input: FacturaProcesamientoInput): Promise<boolean> {
        if (!input.fileBuffer) return false;

        try{

            //1. Extraer la imagen del buffer
            const image = await Jimp.read(input.fileBuffer)
            //2. Convertir la imagen a formato RGBA
            const { data, width, height } = image.bitmap;
            //3. Usar jsQR para detectar el código QR en la imagen
            const qrCode = jsQR(new Uint8ClampedArray(data), width, height);
            if(qrCode){
                this.qrUrlFound, input.qrUrl = qrCode.data;
                
                return true;
            }
            return false;
            
        }catch(error){
            console.error("Error procesando la imagen para QR:", error);
            return false;
        }
        
    }

    //Desacoplar y mover logica hacia infraestructura de scrapping DGI - Futuras mejoras
    async processInvoice(input: FacturaProcesamientoInput): Promise<FacturaProcesamientoResult>{
        const url = input.qrUrl;
        if(!url) throw new Error("No se encontró un código QR válido en la imagen.");

        //Web scrapping para extraer los datos de la factura a partir del URL del QR
        try {
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                }
            });

            const $ = cheerio.load(data);

            // 1. Extraer RUC, DV y Nombre
            const rucProveedor = $('dt:contains("RUC")').next('dd').text().trim();
            const dvProveedor = $('dt:contains("DV")').first().next('dd').text().trim();
            const nombreProveedor = $('dt:contains("NOMBRE")').first().next('dd').text().trim();
            
            // 2. Extraer CUFE
            const cufe = $('.dl-vertical dd').first().text().trim();
            
            // 3. Extraer Numero de Factura (Está en el h5 de la izquierda: "No. 0000352546")
            const facturaTextoRaw = $('.panel-heading h5').first().text().trim();
            const numeroFactura = facturaTextoRaw.replace(/No\.\s+/i, '');

            // 3. Extraer Fecha de Emisión
            const fechaEmision = $('.panel-heading .text-right h5').first().text().trim();

            // 4. Extraer Totales
            const montoTotalRaw = $('td:contains("Valor Total")').find('div').text().trim();

            //5. buscamos solo la palabra ITBMS en los totales
            const itbmsTotalRaw = $('td:contains("ITBMS")').filter((i, el) => $(el).text().includes('Total')).find('div').text().trim();

            // Retornamos el objeto exacto que pide tu clase
            return {
                montoTotal: parseFloat(montoTotalRaw) || 0,
                itbms: parseFloat(itbmsTotalRaw) || 0,
                fechaEmision: fechaEmision,
                rucProveedor: rucProveedor,
                dv: dvProveedor,
                nombreProveedor: nombreProveedor,
                cufe: cufe,
                numeroFactura: numeroFactura
            };

        } catch (error:any) {
            console.error('Error en scraping DGI:', error.message);
            throw new Error(`Error al procesar la factura desde QR: ${error.message}`);
        }
    }
}