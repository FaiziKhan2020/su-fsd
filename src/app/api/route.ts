import {readFileSync} from 'fs';
import { NextResponse } from 'next/server';
import Papa from 'papaparse';

export async function GET(req: Request, res: Response){
    try{
        const data = await readFileSync('data.csv','utf-8')
        // Parse CSV data
        const results = await new Promise((res,rej)=>{
            Papa.parse(data, {
                header: true,
                delimiter:';',
                complete: (results) => {
                console.log('Parsed Results:', results);
                   res(results)
                },
                error: (error:any) => {
                rej(error)
                }
            });
        }) 

        console.log('Papa parsed Res: ', results);
        return NextResponse.json({
            status:'success',
            data: results
        })
    }catch(err){
        console.error(err)
        return NextResponse.json({
            status:'error',
            data: null
        })
    }
}