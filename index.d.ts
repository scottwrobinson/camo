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
        static populate(docs: this | this[]): Promise<this | this[]>;
        getDefault(schemaProp: string): any;
    }

    export class Document extends BaseDocument {
        constructor(name: string);
        meta: CamoMetadata;
        save(): Promise<{}>;
        delete(): Promise<{}>;
        static deleteOne(query: CamoQuery): Promise<{}>;
        static deleteMany(query: CamoQuery): Promise<{}>;
        static loadOne(query: CamoQuery, options?: {
            populate?: boolean,
        }): Promise<this;
        static loadOneAndUpdate(query: CamoQuery, values: any, options?: {
            populate?: boolean,
            upsert?: boolean,
        }): Promise<this>;
        static loadOneAndDelete(query: CamoQuery, options?: {}): Promise<this>;
        static loadMany(query: CamoQuery, options?: {
            populate?: boolean,
        }): Promise<this[]>;
        static count(query: CamoQuery): Promise<number>;
        static clearCollection(): Promise<{}>;
    }

    export class EmbeddedDocument extends BaseDocument {
        constructor();
    }
}
