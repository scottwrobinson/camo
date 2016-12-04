declare module 'camo' {
    type CamoQuery = any;
    type CamoDatabase = any;

    export function connect(uri: string): Promise<CamoDatabase>;

    export interface CamoMetadata {
        collection: string;
    }

    export abstract class BaseDocument {
        constructor();
        schema(definition: any);

        // hooks
        //preValidate();
        //postValidate();
        //preSave();
        //postSave();
        //preDelete();
        //postDelete();

        validate();

        create(data: any): this;
        populate(): Promise<{}>;
        static populate<T>(docs: T): Promise<T>;
        static potulate<T>(docs: T[]): Promise<T[]>;
        getDefault(schemaProp: string): any;
    }

    export class Document extends BaseDocument {
        constructor(name: string);
        meta: CamoMetadata;
        save(): Promise<{}>;
        delete(): Promise<{}>;
        static deleteOne(query: CamoQuery): Promise<{}>;
        static deleteMany(query: CamoQuery): Promise<{}>;
        static loadOne<T>(query: CamoQuery, options?: {
            populate?: boolean,
        }): Promise<T>;
        static loadOneAndUpdate<T>(query: CamoQuery, values: any, options?: {
            populate?: boolean,
            upsert?: boolean,
        }): Promise<T>;
        static loadOneAndDelete<T>(query: CamoQuery, options?: {}): Promise<T>;
        static loadMany<T>(query: CamoQuery, options?: {
            populate?: boolean,
        }): Promise<T[]>;
        static count(query: CamoQuery): Promise<number>;
        static clearCollection(): Promise<{}>;
    }

    export class EmbeddedDocument extends BaseDocument {
        constructor();
    }
}
