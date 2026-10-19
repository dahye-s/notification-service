import { TransactionPort } from '@core/shared/port/transaction.port';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class TransactionAdapter implements TransactionPort {
    constructor(private readonly dataSource: DataSource) {}

    async run<T>(work: () => Promise<T>): Promise<T> {
        return this.dataSource.transaction(async () => work());
    }
}
