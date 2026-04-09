import { NextResponse } from 'next/server'
import graphData from '../../../../public/graph.json'

export async function GET() {
  return NextResponse.json(graphData)
}