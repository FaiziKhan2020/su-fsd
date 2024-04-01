'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface CSVData{
  timestamp: string;
  filename: string;
}

export default function Home() {
  const [sort, setSort] = useState<string>('sort by created at ascendent')
  const [data, setData] = useState<CSVData[]|null>(null);
  const [sortedData, setSortedData] = useState<CSVData[]|null>(null);

  useEffect(()=>{

    try{
      const fetchData = async()=>{
        const csvData = await ((await fetch('http://localhost:3000/api')).json());
        setData(csvData.data.data)
      }
      fetchData()
    }catch(err){

    }

  },[])

  useEffect(()=>{
    if(data){
      let srt = sortByOrder()
      if(srt)
      setSortedData(srt)
    }
  },[data,sort])

  function sortByOrder() {
    if(data)
    switch(sort){
      case 'sort by created at ascendent':
        return [...data].sort((a,b)=> new Date(a.timestamp).getMilliseconds() > new Date(b.timestamp).getMilliseconds() ? -1 : 1)
      case 'sort by filename ascendent':
        return sortFilenameAndNumber()
      case 'sort by filename descendent':
        return sortFilenameAndNumber()
      default:
        break;
    }
  }

  function sortFilenameAndNumber(){
    if(data){
      let numericArrays = data.filter((val)=>extractNumbers(val.filename)?true:false)
      let nonNumericArrays = data.filter((val)=>extractNumbers(val.filename)?false:true)
      let sortedNumericArray = numericArrays.sort((a,b)=> compareFilenames(a,b))
      let sortedNonNumericArray = nonNumericArrays.sort((a,b)=> a.filename.replaceAll('0','') > b.filename.replaceAll('0','') ? 1 : -1 )
      if(sort === 'sort by filename ascendent') return [...sortedNumericArray,...sortedNonNumericArray]
      return [...sortedNonNumericArray.reverse(),...sortedNumericArray]
    }
  }

  function extractNumbers(str:string) {
    const match = str.match(/^\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  function compareFilenames(a:CSVData, b:CSVData) {
    const numA = extractNumbers(a.filename);
    const numB = extractNumbers(b.filename);
    if(numA && numB){
      if (numA !== numB) {
        // First sort by leading numbers
        return numA - numB;
      } else {
          // If leading numbers are equal, sort by the whole string
          if(a.filename.replaceAll('0','') === b.filename.replaceAll('0','')){
            return new Date(a.timestamp).getMilliseconds() > new Date(b.timestamp).getMilliseconds() ? -1 : 1
          }
          return a.filename.localeCompare(b.filename);
      }
    }

    if(!numA && !numB)
      return a.filename.replaceAll('0','') > b.filename.replaceAll('0','') ? 1 : -1;
    if(!numA && numB) return 1
    if(numA && !numB) return -1
    return 1
  }


  return (
    <div className="container mx-auto p-4">
      {/* Dropdown */}
      <div className="mb-4">
        <label htmlFor="dropdown" className="block text-sm font-medium text-gray-700">
          Select an Option
        </label>
        <select
          id="dropdown"
          value={sort}
          onChange={(eve)=>{
            setSort(eve.target.value)
          }}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-black border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value={"sort by created at ascendent"}>sort by created at ascendent</option>
          <option value={"sort by filename ascendent"}>sort by filename ascendent</option>
          <option value={"sort by filename descendent"}>sort by filename descendent</option>
        </select>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-4">
        {
          sortedData?.map((ele:CSVData,idx:number)=>(
            <div key={idx} className="p-4 bg-gray-200 rounded-lg text-black">{ele.timestamp} - {ele.filename}</div>
          ))
        }
      </div>
    </div>
  )
}
